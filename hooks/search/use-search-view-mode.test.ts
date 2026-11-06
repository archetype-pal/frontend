import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { QueryState } from '@/lib/search-query';
import type { ResultType } from '@/lib/search-types';

const hoisted = vi.hoisted(() => ({ params: new URLSearchParams() }));
vi.mock('next/navigation', () => ({ useSearchParams: () => hoisted.params }));

import { useSearchUrlSync } from './use-search-url-sync';
import { useSearchViewMode } from './use-search-view-mode';

const VIEW_PREFS_KEY = 'search-view-prefs';
const QUERY: QueryState = {
  limit: 20,
  offset: 0,
  ordering: null,
  selected_facets: [],
  dateParams: {},
  extraParams: {},
};
const noop = () => {};

function useSearchView({
  resultType,
  query = QUERY,
}: {
  resultType: ResultType;
  query?: QueryState;
}) {
  const view = useSearchViewMode(resultType);
  useSearchUrlSync({
    resultType,
    queryState: query,
    submittedKeyword: '',
    advancedSearchEnabled: false,
    viewMode: view.viewMode,
    setQueryState: noop,
    setDraftKeyword: noop,
    setSubmittedKeyword: noop,
    setAdvancedSearch: noop,
    setViewMode: view.setViewMode,
  });
  return view;
}

function openAt(search: string) {
  hoisted.params = new URLSearchParams(search);
  window.history.replaceState(null, '', `/search/manuscripts?${search}`);
}

afterEach(() => {
  window.localStorage.clear();
  openAt('');
});

describe('search view mode', () => {
  it('opens an old map link in the table over a saved grid choice', () => {
    window.localStorage.setItem(VIEW_PREFS_KEY, JSON.stringify({ manuscripts: 'grid' }));
    openAt('view=map');

    const { result } = renderHook(useSearchView, { initialProps: { resultType: 'manuscripts' } });

    expect(result.current.viewMode).toBe('table');
    expect(window.location.search).not.toContain('map');
  });

  it('opens a saved search with an old map link in the table from another view', () => {
    openAt('view=grid');
    const { result, rerender } = renderHook(useSearchView, {
      initialProps: { resultType: 'manuscripts' },
    });
    expect(result.current.viewMode).toBe('grid');

    // Next reflects the hook's own replaceState in useSearchParams.
    hoisted.params = new URLSearchParams(window.location.search);
    rerender({ resultType: 'manuscripts' });

    openAt('view=map');
    rerender({ resultType: 'manuscripts' });

    expect(result.current.viewMode).toBe('table');
  });

  it('shows the table to someone who last used the map', () => {
    window.localStorage.setItem(VIEW_PREFS_KEY, JSON.stringify({ manuscripts: 'map' }));

    const { result } = renderHook(useSearchView, { initialProps: { resultType: 'manuscripts' } });

    expect(result.current.viewMode).toBe('table');
  });

  it('opens the table when switching to a type last viewed on the map', () => {
    window.localStorage.setItem(VIEW_PREFS_KEY, JSON.stringify({ images: 'map' }));
    openAt('view=grid');
    const { result, rerender } = renderHook(useSearchView, {
      initialProps: { resultType: 'manuscripts' as ResultType },
    });
    expect(result.current.viewMode).toBe('grid');

    rerender({ resultType: 'images' });

    expect(result.current.viewMode).toBe('table');
    expect(JSON.parse(window.localStorage.getItem(VIEW_PREFS_KEY)!).images).toBe('table');
  });

  it('keeps the address bar in sync on a timeline link to a table-only type', () => {
    openAt('view=timeline');
    const { result, rerender } = renderHook(useSearchView, {
      initialProps: { resultType: 'texts' as ResultType, query: QUERY },
    });
    expect(result.current.viewMode).toBe('table');

    act(() => rerender({ resultType: 'texts', query: { ...QUERY, offset: 40 } }));

    expect(window.location.search).toContain('offset=40');
  });

  it('still restores a saved view that exists', () => {
    window.localStorage.setItem(VIEW_PREFS_KEY, JSON.stringify({ manuscripts: 'grid' }));

    const { result } = renderHook(useSearchView, { initialProps: { resultType: 'manuscripts' } });

    expect(result.current.viewMode).toBe('grid');
  });
});
