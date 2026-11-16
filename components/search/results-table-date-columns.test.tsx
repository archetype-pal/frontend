import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { ResultType } from '@/lib/search-types';
import { ResultsTable } from './results-table';

vi.mock('@/contexts/model-labels-context', () => import('@/test/mocks/model-labels-context'));

vi.mock('@/contexts/collection-context', () => ({
  useCollection: () => ({
    isInCollection: () => false,
    addItem: vi.fn(),
    removeItem: vi.fn(),
  }),
}));

const MANUSCRIPT_DATE = 'fieldManuscriptDate';

const MANUSCRIPT_DATE_TYPES: ResultType[] = [
  'manuscripts',
  'images',
  'graphs',
  'texts',
  'clauses',
  'people',
  'places',
];

describe('ResultsTable date columns', () => {
  it.each(MANUSCRIPT_DATE_TYPES)(
    '%s sorts by the manuscript date from a heading named by the site',
    (resultType) => {
      const onSort = vi.fn();
      render(<ResultsTable results={[]} resultType={resultType} onSort={onSort} />);

      fireEvent.click(screen.getByRole('button', { name: MANUSCRIPT_DATE }));

      expect(onSort).toHaveBeenCalledWith({ sortKey: 'date_min', sortUrl: undefined });
    }
  );

  it('hands sort by their own date from the Hand Date heading', () => {
    const onSort = vi.fn();
    render(<ResultsTable results={[]} resultType="hands" onSort={onSort} />);

    fireEvent.click(screen.getByRole('button', { name: 'Hand Date' }));

    expect(onSort).toHaveBeenCalledWith({ sortKey: 'date_min', sortUrl: undefined });
  });

  it.each([
    ['hands', MANUSCRIPT_DATE, 'manuscript_date_min'],
    ['graphs', 'Hand Date', 'hand_date_min'],
  ] as const)('%s sort by their other date from the %s heading', (resultType, heading, sortKey) => {
    const onSort = vi.fn();
    render(<ResultsTable results={[]} resultType={resultType} onSort={onSort} />);

    fireEvent.click(screen.getByRole('button', { name: heading }));

    expect(onSort).toHaveBeenCalledWith({ sortKey, sortUrl: undefined });
  });

  it('keeps the stored column name while the heading shows the date name', () => {
    render(<ResultsTable results={[]} resultType="texts" visibleColumns={['MS Date']} />);

    expect(screen.getByRole('columnheader', { name: MANUSCRIPT_DATE })).toBeTruthy();
    expect(screen.queryByText('MS Date')).toBeNull();
  });

  it('names the scribe date after the scribe', () => {
    render(<ResultsTable results={[]} resultType="scribes" />);

    expect(screen.getByRole('columnheader', { name: 'Scribe Date' })).toBeTruthy();
  });
});
