'use client';

import * as React from 'react';
import { useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { resultTypeItems, type ResultType } from '@/lib/search-types';
import { buildQueryString, getSuggestionsPool, type QueryState } from '@/lib/search-query';
import {
  fetchCount,
  fetchFacetsAndResults,
  getSearchBaseListUrl,
  searchKeys,
} from '@/utils/fetch-facets';
import { useSearchContext } from '@/contexts/search-context';
import type { ViewMode } from '@/components/search/search-actions-menu';

function quickStatsQuery(type: ResultType, keyword: string) {
  const params = new URLSearchParams();
  params.set('limit', '1');
  params.set('offset', '0');
  if (keyword) params.set('q', keyword);
  const url = `${getSearchBaseListUrl(type)}?${params.toString()}`;
  return { url, queryKey: searchKeys.facets(type, `${url}|quick-stats`) };
}

export function useSearchData(opts: {
  resultType: ResultType;
  baseFacetURL: string;
  queryState: QueryState;
  submittedKeyword: string;
  viewMode: ViewMode;
  dataCount: number | undefined;
  results: unknown[];
  enabledCategories: ResultType[];
}) {
  const {
    resultType,
    baseFacetURL,
    queryState,
    submittedKeyword,
    viewMode,
    dataCount,
    results,
    enabledCategories,
  } = opts;
  const { setSuggestionsPool, resetSuggestionsPool } = useSearchContext();
  const queryClient = useQueryClient();

  // The active tab's count comes from the main results query (dataCount), so
  // only the other tabs need a count request — via the list endpoint, which
  // skips the (much heavier) facet-distribution computation.
  const quickStatsItems = React.useMemo(
    () =>
      resultTypeItems.filter(
        (item) => item.value !== resultType && enabledCategories.includes(item.value)
      ),
    [enabledCategories, resultType]
  );

  const quickStatsQueries = useQueries({
    queries: quickStatsItems.map((item) => {
      const { url, queryKey } = quickStatsQuery(item.value, submittedKeyword);
      return {
        queryKey,
        queryFn: async ({ signal }: { signal: AbortSignal }) => fetchCount(item.value, url, signal),
        staleTime: 5 * 60_000,
      };
    }),
  });

  // A count that hasn't arrived yet is left out rather than shown as 0; the
  // tab renders no badge until it's known.
  const countsByType = React.useMemo(() => {
    const next: Partial<Record<ResultType, number>> = {};
    quickStatsItems.forEach((item, idx) => {
      const count = quickStatsQueries[idx]?.data;
      if (count !== undefined) next[item.value] = count;
    });
    const unfiltered =
      queryState.selected_facets.length === 0 &&
      Object.keys(queryState.dateParams).length === 0 &&
      Object.keys(queryState.extraParams ?? {}).length === 0;
    if (dataCount !== undefined) {
      next[resultType] = dataCount;
    } else if (unfiltered) {
      // Right after a type switch the new tab's own results are still loading,
      // but its count was already fetched while it was an inactive tab. That
      // count only reflects the keyword, so it is used only with no filters.
      const cached = queryClient.getQueryData<number>(
        quickStatsQuery(resultType, submittedKeyword).queryKey
      );
      if (cached !== undefined) next[resultType] = cached;
    }
    return next;
  }, [
    dataCount,
    queryState,
    quickStatsItems,
    quickStatsQueries,
    queryClient,
    resultType,
    submittedKeyword,
  ]);

  const graphDistributionQuery = useQuery({
    queryKey: searchKeys.facets(
      'graphs',
      `${baseFacetURL}|dist|${buildQueryString(queryState)}|${submittedKeyword}`
    ),
    enabled: resultType === 'graphs' && viewMode === 'distribution',
    queryFn: async () => {
      const params = new URLSearchParams(buildQueryString(queryState));
      if (submittedKeyword) params.set('q', submittedKeyword);
      params.set('facets', 'date_min,repository_name,hand_name,component_features');
      params.set('limit', '1');
      const url = `${baseFacetURL}?${params.toString()}`;
      return fetchFacetsAndResults('graphs', url);
    },
    staleTime: 10_000,
  });

  // Sync suggestions pool with search results. On cleanup, restore the global
  // (API-loaded) pool rather than clearing to empty — clearing momentarily blanks
  // the header autocomplete and churns the global-load guard on every navigation.
  React.useEffect(() => {
    setSuggestionsPool(getSuggestionsPool(results));
    return () => resetSuggestionsPool();
  }, [results, setSuggestionsPool, resetSuggestionsPool]);

  return {
    quickStatsQueries,
    countsByType,
    graphDistributionQuery,
  };
}
