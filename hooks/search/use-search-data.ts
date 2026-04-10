'use client';

import * as React from 'react';
import { useQueries, useQuery } from '@tanstack/react-query';
import { resultTypeItems, type ResultType } from '@/lib/search-types';
import { buildQueryString, getSuggestionsPool, type QueryState } from '@/lib/search-query';
import {
  fetchCount,
  fetchFacetsAndResults,
  getSearchBaseFacetUrl,
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
  const { setSuggestionsPool } = useSearchContext();

  const quickStatsQueries = useQueries({
    queries: resultTypeItems.map((item) => {
      const params = new URLSearchParams();
      params.set('limit', '1');
      params.set('offset', '0');
      if (submittedKeyword) params.set('q', submittedKeyword);
      const url = `${getSearchBaseFacetUrl(item.value)}?${params.toString()}`;
      return {
        queryKey: searchKeys.facets(item.value, `${url}|quick-stats`),
        queryFn: async ({ signal }: { signal: AbortSignal }) => fetchCount(item.value, url, signal),
        staleTime: 5 * 60_000,
      };
    }),
  });

  const countsByType = React.useMemo(() => {
    const entries = resultTypeItems.map((item, idx) => [
      item.value,
      quickStatsQueries[idx]?.data ?? 0,
    ]);
    const next = Object.fromEntries(entries) as Record<ResultType, number>;
    next[resultType] = dataCount;
    return next;
  }, [dataCount, quickStatsQueries, resultType]);

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

  // Sync suggestions pool with search results
  React.useEffect(() => {
    setSuggestionsPool(getSuggestionsPool(results));
    return () => setSuggestionsPool([]);
  }, [results, setSuggestionsPool]);

  return {
    quickStatsQueries,
    countsByType,
    graphDistributionQuery,
  };
}
