/** @vitest-environment jsdom */
import * as React from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { TooltipProvider } from '@/components/ui/tooltip';
import type { CurrentItemOption, ItemPartNested } from '@/types/backoffice';
import { createTestQueryClient } from '@/test/query-client';

vi.mock('@/contexts/auth-context', () => import('@/test/mocks/auth-context'));

vi.mock('@/contexts/model-labels-context', () => ({
  useModelLabels: () => ({ getLabel: () => 'Shelfmark' }),
}));

function item(id: number, shelfmark: string): CurrentItemOption {
  return {
    id,
    description: '',
    repository: 3,
    repository_name: 'Winchester Coll.',
    shelfmark,
    part_count: 1,
  };
}

vi.mock('@/services/backoffice/manuscripts', () => ({
  getCurrentItem: async () => item(7, '12092'),
  getCurrentItems: async () => ({
    count: 2,
    next: null,
    previous: null,
    results: [item(7, '12092'), item(8, '12093')],
  }),
  getRepositories: async () => [{ id: 3, name: 'Winchester College', label: 'Winchester Coll.' }],
}));

import { CurrentLocationSection } from './current-location-section';

function part(currentItem: number | null, shelfmark = '12092'): ItemPartNested {
  return {
    id: 5,
    custom_label: '',
    current_item: currentItem,
    current_item_display: currentItem ? `Winchester Coll. ${shelfmark}` : null,
    current_item_locus: '',
    display_label: `Winchester Coll. ${shelfmark}`,
    repository: currentItem ? 3 : null,
    repository_name: currentItem ? 'Winchester Coll.' : null,
    shelfmark: currentItem ? shelfmark : null,
    images: [],
    msdesc_areas: [],
  };
}

function renderSection(itemPart: ItemPartNested) {
  const client = createTestQueryClient();
  const ui = (p: ItemPartNested) => (
    <QueryClientProvider client={client}>
      <TooltipProvider>
        <CurrentLocationSection historicalItemId={3} itemParts={[p]} />
      </TooltipProvider>
    </QueryClientProvider>
  );
  const { rerender } = render(ui(itemPart));
  return (next: ItemPartNested) => rerender(ui(next));
}

async function pick(name: string) {
  fireEvent.click(screen.getByRole('combobox'));
  fireEvent.change(screen.getByPlaceholderText('Search by repository or shelfmark...'), {
    target: { value: 'winchester' },
  });
  fireEvent.click(await screen.findByRole('option', { name }));
}

describe('CurrentLocationSection', () => {
  it('edits the linked item from the manuscript page', async () => {
    renderSection(part(7));

    fireEvent.click(screen.getByRole('button', { name: 'Edit item Winchester Coll. 12092' }));

    const shelfmark = await screen.findByLabelText(/Shelfmark/);
    expect((shelfmark as HTMLInputElement).value).toBe('12092');
  });

  it('has nothing to edit while no item is linked', () => {
    renderSection(part(null));

    expect(screen.queryByRole('button', { name: /^Edit item/ })).toBeNull();
  });

  it('edits only the saved item, not one picked but not saved yet', async () => {
    const rerender = renderSection(part(7));

    await pick('Winchester Coll. 12093');
    expect(screen.queryByRole('button', { name: /^Edit item/ })).toBeNull();

    rerender(part(8, '12093'));
    expect(screen.getByRole('button', { name: 'Edit item Winchester Coll. 12093' })).toBeDefined();
  });

  it('shows the new name after the linked item is renamed', async () => {
    const rerender = renderSection(part(7));

    await pick('Winchester Coll. 12093');
    rerender(part(8, '12093'));
    rerender(part(8, '12094'));

    expect(screen.getByRole('combobox').textContent).toBe('Winchester Coll. 12094');
  });
});
