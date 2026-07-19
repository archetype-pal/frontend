'use client';

import * as React from 'react';
import { useQueries, useQuery } from '@tanstack/react-query';
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

export function useSearchData(opts: {
  resultType: ResultType;
  baseFacetURL: string;
  queryState: QueryState;
  submittedKeyword: string;
  viewMode: ViewMode;
  dataCount: number;
  results: unknown[];
}) {
  const { resultType, baseFacetURL, queryState, submittedKeyword, viewMode, dataCount, results } =
    opts;
  const { setSuggestionsPool, resetSuggestionsPool } = useSearchContext();

  // The active tab's count comes from the main results query (dataCount), so
  // only the other tabs need a count request — via the list endpoint, which
  // skips the (much heavier) facet-distribution computation.
  const quickStatsItems = React.useMemo(
    () => resultTypeItems.filter((item) => item.value !== resultType),
    [resultType]
  );

  const quickStatsQueries = useQueries({
    queries: quickStatsItems.map((item) => {
      const params = new URLSearchParams();
      params.set('limit', '1');
      params.set('offset', '0');
      if (submittedKeyword) params.set('q', submittedKeyword);
      const url = `${getSearchBaseListUrl(item.value)}?${params.toString()}`;
      return {
        queryKey: searchKeys.facets(item.value, `${url}|quick-stats`),
        queryFn: async ({ signal }: { signal: AbortSignal }) => fetchCount(item.value, url, signal),
        staleTime: 5 * 60_000,
      };
    }),
  });

  const countsByType = React.useMemo(() => {
    const entries = quickStatsItems.map((item, idx) => [
      item.value,
      quickStatsQueries[idx]?.data ?? 0,
    ]);
    const next = Object.fromEntries(entries) as Record<ResultType, number>;
    next[resultType] = dataCount;
    return next;
  }, [dataCount, quickStatsItems, quickStatsQueries, resultType]);

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
