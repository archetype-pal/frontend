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

  it('names a date sort after the date it sorts on', () => {
    const graphs: SearchOrdering = {
      current: 'hand_date_min',
      options: [
        {
          name: 'hand_date_min',
          text: 'hand_date_min',
          url: '/search/graphs?ordering=hand_date_min',
        },
        {
          name: '-hand_date_min',
          text: 'hand_date_min',
          url: '/search/graphs?ordering=-hand_date_min',
        },
      ],
    };

    render(
      <SortControl
        ordering={graphs}
        value="hand_date_min"
        onChange={vi.fn()}
        dateNames={{ hand_date_min: 'Hand Date', hand_date_max: 'Hand Date' }}
      />
    );

    expect(screen.getByText('Hand Date (earliest)')).toBeTruthy();
  });
});
