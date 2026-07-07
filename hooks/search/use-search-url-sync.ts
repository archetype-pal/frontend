'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import type { ResultType } from '@/lib/search-types';
import type { ViewMode } from '@/components/search/search-actions-menu';
import {
  buildQueryString,
  parseQueryRootFromUrl,
  stateFromSearchParams,
  type QueryState,
} from '@/lib/search-query';
import type { AdvancedSearchState } from '@/components/search/advanced-search-panel';
import { parseViewModeParam } from '@/hooks/search/use-search-view-mode';

export function useSearchUrlSync(opts: {
  resultType: ResultType;
  queryState: QueryState;
  submittedKeyword: string;
  advancedSearchEnabled: boolean;
  viewMode: ViewMode;
  setQueryState: React.Dispatch<React.SetStateAction<QueryState>>;
  setDraftKeyword: (value: string) => void;
  setSubmittedKeyword: (value: string) => void;
  setAdvancedSearch: React.Dispatch<React.SetStateAction<AdvancedSearchState>>;
  setViewMode: React.Dispatch<React.SetStateAction<ViewMode>>;
}) {
  const {
    resultType,
    queryState,
    submittedKeyword,
    advancedSearchEnabled,
    viewMode,
    setQueryState,
    setDraftKeyword,
    setSubmittedKeyword,
    setAdvancedSearch,
    setViewMode,
  } = opts;

  const searchParams = useSearchParams();
  const isInternalUrlUpdate = React.useRef(false);

  // Read the latest resultType inside the URL→state effect WITHOUT depending on
  // it. A client-side type switch (handleResultTypeChange) changes resultType but
  // NOT searchParams — and because useSearchParams() doesn't reflect our
  // history.replaceState, re-running this effect on a resultType change would
  // re-read the STALE URL and clobber the fresh reset (re-applying the old
  // page/offset + filters, landing the new type on an out-of-range page). Real
  // navigations still drive the sync via the searchParams dependency.
  const resultTypeRef = React.useRef(resultType);
  resultTypeRef.current = resultType;

  // Sync from URL to state (external navigation, popstate)
  React.useEffect(() => {
    if (isInternalUrlUpdate.current) {
      isInternalUrlUpdate.current = false;
      return;
    }
    const kw = searchParams.get('keyword');
    const value = kw ?? '';
    setDraftKeyword(value);
    setSubmittedKeyword(value);
    setQueryState(stateFromSearchParams(searchParams));
    const notFacetEntry =
      Array.from(searchParams.entries()).find(([key]) => key.endsWith('__not')) ?? null;
    const rangeMinEntry =
      Array.from(searchParams.entries()).find(([key]) => key.endsWith('__min')) ?? null;
    const rangeMaxEntry =
      Array.from(searchParams.entries()).find(([key]) => key.endsWith('__max')) ?? null;
    const viewFromUrl = parseViewModeParam(searchParams.get('view'), resultTypeRef.current);
    if (viewFromUrl) setViewMode(viewFromUrl);
    setAdvancedSearch((prev) => ({
      ...prev,
      enabled:
        searchParams.get('advanced') === 'true' ||
        searchParams.get('matching_strategy') != null ||
        searchParams.get('search_field') != null ||
        searchParams.get('qb') != null ||
        notFacetEntry != null ||
        rangeMinEntry != null ||
        rangeMaxEntry != null,
      matchingStrategy:
        searchParams.get('matching_strategy') === 'last'
          ? 'last'
          : searchParams.get('matching_strategy') === 'all'
            ? 'all'
            : prev.matchingStrategy,
      searchField: searchParams.get('search_field') ?? '',
      queryRoot: parseQueryRootFromUrl(searchParams),
    }));
    // resultType is intentionally NOT a dependency — see resultTypeRef above.
    // Re-running this URL→state sync on an internal type switch would clobber the
    // just-reset query state from the stale URL.
  }, [
    searchParams,
    setQueryState,
    setDraftKeyword,
    setSubmittedKeyword,
    setAdvancedSearch,
    setViewMode,
  ]);

  // Sync from state to URL (internal state changes)
  React.useEffect(() => {
    const qs = buildQueryString(queryState);
    const params = new URLSearchParams(qs);
    if (submittedKeyword) params.set('keyword', submittedKeyword);
    if (advancedSearchEnabled) params.set('advanced', 'true');
    if (viewMode !== 'table') {
      params.set('view', viewMode);
    }
    const path = '/search/' + resultType + (params.toString() ? '?' + params.toString() : '');
    const currentPath = window.location.pathname + window.location.search;
    if (path !== currentPath) {
      isInternalUrlUpdate.current = true;
      window.history.replaceState(null, '', path);
    }
  }, [advancedSearchEnabled, queryState, resultType, submittedKeyword, viewMode]);
}
