/** @vitest-environment jsdom */
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { SearchOrdering } from '@/lib/search-sort';
import { SortControl } from './sort-control';

const ordering: SearchOrdering = {
  current: '-id',
  options: [
    { name: 'shelfmark', text: 'Shelfmark', url: '/search/manuscripts?ordering=shelfmark' },
    { name: '-shelfmark', text: 'Shelfmark', url: '/search/manuscripts?ordering=-shelfmark' },
  ],
};

describe('<SortControl>', () => {
  it('shows a visible label for the sort dropdown', () => {
    render(
      <SortControl ordering={ordering} value={null} onChange={vi.fn()} className="inline-flex" />
    );

    expect(screen.getByText('Sort by')).toBeTruthy();
    expect(screen.getByLabelText('Sort results by')).toBeTruthy();
    const directionButton = screen.getByRole('button', {
      name: 'Reverse sort order (Ascending)',
    }) as HTMLButtonElement;
    expect(directionButton.disabled).toBe(true);
  });

  const dateOrdering: SearchOrdering = {
    current: '-id',
    options: ['date_min', '-date_min', 'date_max', '-date_max'].map((name) => ({
      name,
      text: name,
      url: `/search?ordering=${name}`,
    })),
  };

  it.each([
    ['hands', 'date_min', 'Hand Date (earliest)'],
    ['hands', 'date_max', 'Hand Date (latest)'],
    ['manuscripts', 'date_min', 'Date (earliest)'],
  ])('names the %s %s sort %s', (resultType, value, label) => {
    render(
      <SortControl
        ordering={dateOrdering}
        value={value}
        onChange={vi.fn()}
        resultType={resultType}
      />
    );

    expect(screen.getByText(label)).toBeTruthy();
  });
});
