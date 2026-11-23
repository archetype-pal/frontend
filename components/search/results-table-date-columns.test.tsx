import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { renderWithQueryClient } from '@/test/render';
import type { GraphListItem } from '@/types/search';
import { ResultsTable } from './results-table';

vi.mock('@/contexts/model-labels-context', () => import('@/test/mocks/model-labels-context'));
vi.mock('next/navigation', () => import('@/test/mocks/next-navigation'));

vi.mock('@/contexts/collection-context', () => ({
  useCollection: () => ({
    isInCollection: () => false,
    addItem: vi.fn(),
    removeItem: vi.fn(),
  }),
}));

describe('ResultsTable date columns', () => {
  it.each([
    ['manuscripts', 'Text Date'],
    ['images', 'Date'],
    ['hands', 'Hand Date'],
    ['texts', 'MS Date'],
    ['clauses', 'Text Date'],
    ['people', 'Text Date'],
    ['places', 'Text Date'],
  ] as const)('%s sorts by date from its %s heading', (resultType, heading) => {
    const onSort = vi.fn();
    render(<ResultsTable results={[]} resultType={resultType} onSort={onSort} />);

    fireEvent.click(screen.getByRole('button', { name: heading }));

    expect(onSort).toHaveBeenCalledWith({ sortKey: 'date_min', sortUrl: undefined });
  });

  it('heads the stored hands Date column with Hand Date', () => {
    render(<ResultsTable results={[]} resultType="hands" visibleColumns={['Date']} />);

    expect(screen.getByRole('columnheader', { name: 'Hand Date' })).toBeTruthy();
    expect(screen.queryByRole('columnheader', { name: 'Date' })).toBeNull();
  });

  it('graphs sort by the hand date from the Hand Date heading', () => {
    const onSort = vi.fn();
    render(
      <ResultsTable
        results={[]}
        resultType="graphs"
        visibleColumns={['Hand Date']}
        onSort={onSort}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Hand Date' }));

    expect(onSort).toHaveBeenCalledWith({ sortKey: 'hand_date_min', sortUrl: undefined });
  });

  it("shows each graph's hand date beside the manuscript date", () => {
    const graph: GraphListItem = {
      id: 7,
      item_image: 1576,
      item_part: 227,
      repository_name: 'British Library',
      repository_city: 'London',
      shelfmark: 'Cotton Ch. xviii.13',
      date: '1160',
      hand_date: 's. xii med.',
      image_iiif: 'https://example.test/iiif/2/image.jp2/info.json',
      coordinates: '{"type":"Feature"}',
      is_annotated: true,
    };
    renderWithQueryClient(
      <ResultsTable
        results={[graph]}
        resultType="graphs"
        visibleColumns={['Document Date', 'Hand Date']}
      />
    );

    expect(screen.getAllByRole('cell').map((cell) => cell.textContent)).toEqual(
      expect.arrayContaining(['1160', 's. xii med.'])
    );
  });
});
