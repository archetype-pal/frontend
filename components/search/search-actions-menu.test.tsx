import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { ResultType } from '@/lib/search-types';
import { SearchActionsMenu } from './search-actions-menu';

const dateOrdering = {
  current: '-id',
  options: ['date_min', '-date_min', 'date_max', '-date_max'].map((name) => ({
    name,
    text: name,
    url: `/search?ordering=${name}`,
  })),
};

function openMenu(resultType: ResultType) {
  render(
    <SearchActionsMenu
      keyword=""
      filterCount={0}
      resultCount={0}
      viewMode="table"
      setViewMode={vi.fn()}
      showGridToggle={false}
      showTimelineToggle={false}
      showDistributionToggle={false}
      hasTimelineData={false}
      distributionEnabled={false}
      advancedEnabled={false}
      onToggleAdvanced={vi.fn()}
      handleExport={vi.fn()}
      handleFormattedExport={vi.fn()}
      exportBusy={false}
      resultType={resultType}
      isResearcher={false}
      ordering={dateOrdering}
      sortValue={null}
      onSortChange={vi.fn()}
    />
  );
  fireEvent.pointerDown(screen.getByRole('button', { name: 'Search actions' }), {
    button: 0,
    ctrlKey: false,
  });
}

describe('<SearchActionsMenu> sort section', () => {
  it('names the hands date sorts after the hand', () => {
    openMenu('hands');

    expect(screen.getByRole('menuitem', { name: 'Hand Date (earliest)' })).toBeTruthy();
    expect(screen.getByRole('menuitem', { name: 'Hand Date (latest)' })).toBeTruthy();
  });

  it('keeps the plain date sorts on other tabs', () => {
    openMenu('manuscripts');

    expect(screen.getByRole('menuitem', { name: 'Date (earliest)' })).toBeTruthy();
    expect(screen.queryByRole('menuitem', { name: /Hand Date/ })).toBeNull();
  });
});
