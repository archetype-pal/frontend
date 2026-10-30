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

vi.mock('./item-part-hands-section', () => ({ ItemPartHandsSection: () => null }));

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
  getCurrentItem: async (id: number) => item(id, id === 7 ? '12092' : '12093'),
  getCurrentItems: async () => ({
    count: 1,
    next: null,
    previous: null,
    results: [item(9, '12099')],
  }),
  getRepositories: async () => [{ id: 3, name: 'Winchester College', label: 'Winchester Coll.' }],
  createItemPart: vi.fn(),
  updateItemPart: vi.fn(),
  deleteItemPart: vi.fn(),
}));

import { ItemPartsTab } from './item-parts-tab';

function part(id: number, label: string, currentItem: number, shelfmark: string): ItemPartNested {
  return {
    id,
    custom_label: label,
    current_item: currentItem,
    current_item_display: `Winchester Coll. ${shelfmark}`,
    current_item_locus: '',
    display_label: label,
    repository: 3,
    repository_name: 'Winchester Coll.',
    shelfmark,
    images: [],
    msdesc_areas: [],
  };
}

describe('ItemPartsTab', () => {
  it("edits each part's own item", async () => {
    const client = createTestQueryClient();
    render(
      <QueryClientProvider client={client}>
        <TooltipProvider>
          <ItemPartsTab
            historicalItemId={3}
            itemParts={[part(5, 'Part A', 7, '12092'), part(6, 'Part B', 8, '12093')]}
          />
        </TooltipProvider>
      </QueryClientProvider>
    );

    fireEvent.click(screen.getByText('Part A'));
    fireEvent.click(screen.getByText('Part B'));
    expect(screen.getByRole('button', { name: 'Edit item Winchester Coll. 12092' })).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Edit item Winchester Coll. 12093' }));

    const shelfmark = await screen.findByLabelText(/Shelfmark/);
    expect((shelfmark as HTMLInputElement).value).toBe('12093');
  });

  it('keeps an unsaved pick when another part renames the shared item', async () => {
    const client = createTestQueryClient();
    const ui = (shelfmark: string) => (
      <QueryClientProvider client={client}>
        <TooltipProvider>
          <ItemPartsTab
            historicalItemId={3}
            itemParts={[part(5, 'Part A', 7, shelfmark), part(6, 'Part B', 7, shelfmark)]}
          />
        </TooltipProvider>
      </QueryClientProvider>
    );
    const { rerender } = render(ui('12092'));

    fireEvent.click(screen.getByText('Part A'));
    fireEvent.click(screen.getByRole('combobox'));
    fireEvent.change(screen.getByPlaceholderText('Search by repository or shelfmark...'), {
      target: { value: 'winchester' },
    });
    fireEvent.click(await screen.findByRole('option', { name: 'Winchester Coll. 12099' }));
    rerender(ui('12092a'));

    expect(screen.getByRole('combobox').textContent).toBe('Winchester Coll. 12099');
  });
});
