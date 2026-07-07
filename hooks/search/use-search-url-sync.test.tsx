import * as React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import type { QueryState } from '@/lib/search-query';
import type { ViewMode } from '@/components/search/search-actions-menu';

// useSearchParams must return a STABLE reference across renders (as Next does
// until a real navigation) so the test exercises the real invariant: a
// client-side result-type switch changes resultType but NOT searchParams.
const hoisted = vi.hoisted(() => ({ params: new URLSearchParams('limit=20&offset=700') }));
vi.mock('next/navigation', () => ({ useSearchParams: () => hoisted.params }));

import { useSearchUrlSync } from './use-search-url-sync';

const QS_700: QueryState = {
  limit: 20,
  offset: 700,
  ordering: null,
  selected_facets: [],
  dateParams: {},
  extraParams: {},
};

// Stable setter identities across renders (as real useState setters are) — so
// the URL→state effect only re-runs when its genuine deps (searchParams) change,
// isolating the resultType-change behaviour under test.
const noop = () => {};

function Harness(props: {
  resultType: 'manuscripts' | 'images';
  queryState: QueryState;
  setQueryState: (v: unknown) => void;
}) {
  useSearchUrlSync({
    resultType: props.resultType,
    queryState: props.queryState,
    submittedKeyword: '',
    advancedSearchEnabled: false,
    viewMode: 'table' as ViewMode,
    setQueryState: props.setQueryState as never,
    setDraftKeyword: noop,
    setSubmittedKeyword: noop,
    setAdvancedSearch: noop as never,
    setViewMode: noop as never,
  });
  return null;
}

describe('useSearchUrlSync — result-type switch does not clobber the reset', () => {
  it('does not re-sync query state from the stale URL when only resultType changes', () => {
    // We are genuinely on manuscripts page 36; URL matches the query state so the
    // mount's state→URL effect performs no internal replaceState.
    window.history.replaceState(null, '', '/search/manuscripts?limit=20&offset=700');
    const setQueryState = vi.fn();

    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    act(() => {
      root.render(
        <Harness resultType="manuscripts" queryState={QS_700} setQueryState={setQueryState} />
      );
    });

    // Mount already performed the initial URL→state sync; ignore it.
    setQueryState.mockClear();

    // Simulate handleResultTypeChange: the type flips AND offset was just reset to
    // 0. searchParams is unchanged (still the stale offset=700 URL).
    act(() => {
      root.render(
        <Harness
          resultType="images"
          queryState={{ ...QS_700, offset: 0 }}
          setQueryState={setQueryState}
        />
      );
    });

    // The URL→state effect must NOT re-run and re-read offset=700 from the stale
    // URL — doing so would clobber the reset and land Images on an out-of-range
    // page. (Regression guard for the type-switch offset bug.)
    expect(setQueryState).not.toHaveBeenCalled();

    act(() => {
      root.unmount();
    });
    container.remove();
  });
});
