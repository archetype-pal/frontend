/** @vitest-environment jsdom */
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { SearchOrdering } from '@/lib/search-sort';
import { SortControl } from './sort-control';

vi.mock('next-intl', () => ({
  useTranslations: () => {
    const messages: Record<string, string> = {
      sortAscending: 'Ascending',
      sortBy: 'Sort by',
      sortByLabel: 'Sort results by',
      sortDefault: 'Default',
      sortDescending: 'Descending',
      sortReverse: 'Reverse sort order',
      'sortFields.shelfmark': 'Shelfmark',
    };
    const t = (key: string) => messages[key] ?? key;
    t.has = (key: string) => key in messages;
    return t;
  },
}));

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
});
