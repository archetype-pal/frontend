import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ResultsTable } from './results-table';

vi.mock('@/contexts/model-labels-context', () => import('@/test/mocks/model-labels-context'));

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
    ['hands', 'Date'],
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
});
