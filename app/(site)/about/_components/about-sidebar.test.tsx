import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getDefaultConfig } from '@/lib/site-features';
import type { MenuHeading, PageListItem } from '@/lib/pages';
import { AboutSidebar } from './about-sidebar';

const mockState = vi.hoisted(() => ({
  pages: [] as PageListItem[],
  headings: [] as MenuHeading[],
  searchEnabled: true,
}));

vi.mock('next-intl/server', () => ({
  getLocale: async () => 'fr',
  getTranslations: async () => (key: string) => key,
}));

vi.mock('@/lib/pages-server', () => ({
  getPublishedPages: async () => mockState.pages,
  getMenuHeadings: async () => mockState.headings,
}));

vi.mock('@/lib/site-features-server', () => ({
  readSiteFeatures: async () => {
    const config = getDefaultConfig();
    config.sections.search = mockState.searchEnabled;
    return config;
  },
}));

function listItem(slug: string, title: string, menuHeading: string | null): PageListItem {
  return {
    id: 0,
    slug,
    title: { en: title, fr: '', de: '' },
    status: 'Published',
    menu_heading: menuHeading,
    order: 0,
    include_in_quick_link: false,
    updated_at: '',
  };
}

async function renderSidebar(menuHeading: string | null) {
  render(await AboutSidebar({ menuHeading }));
}

function linkHrefs() {
  return screen.getAllByRole('link').map((link) => link.getAttribute('href'));
}

beforeEach(() => {
  mockState.headings = [{ id: 1, slug: 'help', title: { en: 'Help', fr: 'Aide', de: '' } }];
  mockState.pages = [
    listItem('about-the-project', 'About the Project', null),
    listItem('how-to-use', 'How to use', 'help'),
    listItem('orphan', 'Orphan', 'deleted-heading'),
  ];
  mockState.searchEnabled = true;
});

describe('<AboutSidebar>', () => {
  it("lists only the current heading's pages, under its localised title", async () => {
    await renderSidebar('help');

    expect(screen.getByRole('heading', { name: 'Aide' })).toBeTruthy();
    // No "Search" link: it belongs to About only.
    expect(linkHrefs()).toEqual(['/about/how-to-use']);
  });

  it('lists About pages, pages of a deleted heading, and the Search link under About', async () => {
    await renderSidebar(null);

    expect(screen.getByRole('heading', { name: 'heading' })).toBeTruthy();
    expect(linkHrefs()).toEqual([
      '/about/about-the-project',
      '/about/orphan',
      expect.stringMatching(/^\/search\//),
    ]);
  });

  it('shows About for a page whose heading was deleted', async () => {
    await renderSidebar('deleted-heading');

    expect(screen.getByRole('heading', { name: 'heading' })).toBeTruthy();
    expect(linkHrefs()).toContain('/about/orphan');
  });

  it('drops the Search link when the search section is off', async () => {
    mockState.searchEnabled = false;
    await renderSidebar(null);

    expect(linkHrefs()).toEqual(['/about/about-the-project', '/about/orphan']);
  });
});
