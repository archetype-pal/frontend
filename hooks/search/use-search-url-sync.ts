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
  compareIds: string[];
  viewMode: ViewMode;
  setQueryState: React.Dispatch<React.SetStateAction<QueryState>>;
  setDraftKeyword: (value: string) => void;
  setSubmittedKeyword: (value: string) => void;
  setCompareIds: React.Dispatch<React.SetStateAction<string[]>>;
  setAdvancedSearch: React.Dispatch<React.SetStateAction<AdvancedSearchState>>;
  setViewMode: React.Dispatch<React.SetStateAction<ViewMode>>;
}) {
  const {
    resultType,
    queryState,
    submittedKeyword,
    advancedSearchEnabled,
    compareIds,
    viewMode,
    setQueryState,
    setDraftKeyword,
    setSubmittedKeyword,
    setCompareIds,
    setAdvancedSearch,
    setViewMode,
  } = opts;

  const searchParams = useSearchParams();
  const isInternalUrlUpdate = React.useRef(false);

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
    const compareRaw = searchParams.get('compare') ?? '';
    setCompareIds(
      compareRaw
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean)
    );
    const notFacetEntry =
      Array.from(searchParams.entries()).find(([key]) => key.endsWith('__not')) ?? null;
    const rangeMinEntry =
      Array.from(searchParams.entries()).find(([key]) => key.endsWith('__min')) ?? null;
    const rangeMaxEntry =
      Array.from(searchParams.entries()).find(([key]) => key.endsWith('__max')) ?? null;
    const viewFromUrl = parseViewModeParam(searchParams.get('view'), resultType);
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
  }, [
    searchParams,
    resultType,
    setQueryState,
    setDraftKeyword,
    setSubmittedKeyword,
    setCompareIds,
    setAdvancedSearch,
    setViewMode,
  ]);

  // Sync from state to URL (internal state changes)
  React.useEffect(() => {
    const qs = buildQueryString(queryState);
    const params = new URLSearchParams(qs);
    if (submittedKeyword) params.set('keyword', submittedKeyword);
    if (advancedSearchEnabled) params.set('advanced', 'true');
    if (compareIds.length > 0) {
      params.set('compare', compareIds.join(','));
    }
    if (viewMode !== 'table') {
      params.set('view', viewMode);
    }
    const path = '/search/' + resultType + (params.toString() ? '?' + params.toString() : '');
    const currentPath = window.location.pathname + window.location.search;
    if (path !== currentPath) {
      isInternalUrlUpdate.current = true;
      window.history.replaceState(null, '', path);
    }
  }, [advancedSearchEnabled, compareIds, queryState, resultType, submittedKeyword, viewMode]);
}
