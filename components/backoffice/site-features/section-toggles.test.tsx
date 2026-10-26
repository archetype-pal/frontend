import { render, screen } from '@testing-library/react';
import type { DragEndEvent } from '@dnd-kit/core';
import { act } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getDefaultConfig, type NavKey } from '@/lib/site-features';
import type { MenuHeading } from '@/lib/pages';
import { SectionToggles } from './section-toggles';

// jsdom has no layout, so a real drag can't pick a drop target. The tests grab
// the component's drop handler instead and call it with the drag's outcome.
const dnd = vi.hoisted(() => ({ onDragEnd: undefined as ((e: DragEndEvent) => void) | undefined }));
vi.mock('@dnd-kit/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@dnd-kit/core')>();
  return {
    ...actual,
    DndContext: ({
      children,
      onDragEnd,
    }: {
      children: React.ReactNode;
      onDragEnd: (e: DragEndEvent) => void;
    }) => {
      dnd.onDragEnd = onDragEnd;
      return <>{children}</>;
    },
  };
});

vi.mock('next-intl', () => ({
  useLocale: () => 'fr',
  useTranslations: () => (key: string, values?: Record<string, string>) =>
    values?.section ? `${key}:${values.section}` : key,
}));

const help: MenuHeading = { id: 1, slug: 'help', title: { en: 'Help', fr: 'Aide', de: '' } };

const onOrderChange = vi.fn();

function renderToggles(sectionOrder: NavKey[], menuHeadings: MenuHeading[] | undefined) {
  render(
    <SectionToggles
      sections={getDefaultConfig().sections}
      sectionOrder={sectionOrder}
      menuHeadings={menuHeadings}
      onChange={vi.fn()}
      onOrderChange={onOrderChange}
    />
  );
}

/** The reorder handles' labels, in display order. */
function handleLabels() {
  return screen
    .getAllByRole('button', { name: /^siteFeatures\.reorderSection:/ })
    .map((button) => button.getAttribute('aria-label')!.split(':')[1]);
}

function drag(active: string, over: string) {
  act(() => dnd.onDragEnd!({ active: { id: active }, over: { id: over } } as DragEndEvent));
}

beforeEach(() => {
  onOrderChange.mockReset();
  dnd.onDragEnd = undefined;
});

describe('<SectionToggles> menu headings', () => {
  it('shows a heading card at its stored position, under its localised title', () => {
    renderToggles(['search', 'heading:help', 'about'], [help]);

    expect(handleLabels().slice(0, 3)).toEqual([
      'siteFeatures.sections.search',
      'Aide',
      'siteFeatures.sections.about',
    ]);
  });

  it('drops a deleted heading and appends a heading the order does not mention', () => {
    const events: MenuHeading = { id: 2, slug: 'events', title: { en: 'Events', fr: '', de: '' } };
    renderToggles(['heading:gone', 'search'], [help, events]);

    const labels = handleLabels();
    expect(labels).not.toContain('gone');
    expect(labels.slice(-2)).toEqual(['Aide', 'Events']);
  });

  it('reorders a heading among the built-in sections', () => {
    renderToggles(['search', 'about', 'heading:help'], [help]);

    drag('heading:help', 'search');

    expect(onOrderChange).toHaveBeenCalledWith(
      expect.arrayContaining(['heading:help', 'search', 'about'])
    );
    const order: NavKey[] = onOrderChange.mock.calls[0][0];
    expect(order.indexOf('heading:help')).toBeLessThan(order.indexOf('search'));
  });

  it('keeps stored heading positions while the headings are not loaded', () => {
    renderToggles(['search', 'heading:help', 'about'], undefined);

    // Shown by slug, at their stored place, rather than dropped.
    expect(handleLabels().slice(0, 3)).toEqual([
      'siteFeatures.sections.search',
      'help',
      'siteFeatures.sections.about',
    ]);

    drag('about', 'search');

    expect(onOrderChange).toHaveBeenCalledWith(['about', 'search', 'heading:help']);
  });
});
