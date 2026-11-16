/** @vitest-environment jsdom */
import { screen, fireEvent, waitFor, act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { backofficeKeys } from '@/lib/backoffice/query-keys';
import { renderWithQueryClient } from '@/test/render';
import type { ItemPartNested } from '@/types/backoffice';

const getHistoricalItem = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('@/contexts/auth-context', () => import('@/test/mocks/auth-context'));
vi.mock('sonner', () => import('@/test/mocks/sonner'));
vi.mock('@/hooks/backoffice/use-lookups', () => ({
  useDates: () => ({ data: [] }),
  useFormats: () => ({ data: [] }),
}));
vi.mock('@/services/backoffice/manuscripts', () => ({
  getHistoricalItem: (...args: unknown[]) => getHistoricalItem(...args),
  updateHistoricalItem: vi.fn(),
  deleteHistoricalItem: vi.fn(),
}));
vi.mock('./catalogue-numbers-section', () => ({ CatalogueNumbersSection: () => null }));
vi.mock('./descriptions-section', () => ({ DescriptionsSection: () => null }));
vi.mock('./msdesc-section', () => ({ MsDescSection: () => null }));
vi.mock('./current-location-section', () => ({ CurrentLocationSection: () => null }));
vi.mock('./item-parts-tab', () => ({ ItemPartsTab: () => null }));

import { ManuscriptWorkspace } from './manuscript-workspace';

const ITEM = {
  id: 3,
  type: 'Charter',
  format: null,
  language: 'Latin',
  hair_type: '',
  date: null,
  probable_text_date: '',
  dating_notes: '',
  catalogue_numbers: [],
  descriptions: [],
  item_parts: [],
  origins: [],
};

function part(id: number, currentItem: number | null): ItemPartNested {
  return {
    id,
    custom_label: '',
    current_item: currentItem,
    current_item_display: null,
    current_item_locus: '',
    display_label: `Part ${id}`,
    repository: null,
    repository_name: null,
    shelfmark: null,
    images: [],
    msdesc_areas: [],
  };
}

beforeEach(() => {
  getHistoricalItem.mockReset();
  getHistoricalItem.mockResolvedValue(ITEM);
});

describe('<ManuscriptWorkspace>', () => {
  it('keeps unsaved edits when the manuscript refetches, e.g. after editing its item', async () => {
    const { client } = renderWithQueryClient(<ManuscriptWorkspace itemId={3} />, {
      modelLabels: true,
      tooltip: true,
    });
    const language = (await screen.findByDisplayValue('Latin')) as HTMLInputElement;
    fireEvent.change(language, { target: { value: 'Scots' } });

    getHistoricalItem.mockResolvedValue({ ...ITEM, probable_text_date: 'c. 1200' });
    await act(() => client.invalidateQueries({ queryKey: backofficeKeys.manuscripts.detail(3) }));
    await waitFor(() => expect(getHistoricalItem).toHaveBeenCalledTimes(2));

    expect(language.value).toBe('Scots');
  });

  it.each([
    ['links the title to the public page of the only part', [part(7, 9)], '/manuscripts/7'],
    ['shows no title link when the item has several parts', [part(7, 9), part(8, 9)], null],
    ['shows no title link when the only part has no item', [part(7, null)], null],
  ])('%s', async (_, item_parts, href) => {
    getHistoricalItem.mockResolvedValue({ ...ITEM, item_parts });
    renderWithQueryClient(<ManuscriptWorkspace itemId={3} />, { modelLabels: true, tooltip: true });

    await screen.findByRole('heading', { name: 'Part 7' });
    const link = screen.queryByRole('link', { name: 'View public page' });
    expect(link?.getAttribute('href') ?? null).toBe(href);
  });
});
