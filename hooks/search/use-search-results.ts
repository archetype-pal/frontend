'use client';

import { useEffect, useMemo } from 'react';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ResultType } from '@/lib/search-types';
import { type QueryState, withOffset } from '@/lib/search-query';
import {
  buildSearchRequestUrl,
  EMPTY_SEARCH_RESULT,
  fetchFacetsAndResults,
  getSearchBaseFacetUrl,
  searchKeys,
  type SearchResult,
} from '@/utils/fetch-facets';

export function useSearchResults(resultType: ResultType, queryState: QueryState, keyword: string) {
  const baseFacetURL = useMemo(() => getSearchBaseFacetUrl(resultType), [resultType]);

  const apiUrl = useMemo(
    () => buildSearchRequestUrl(resultType, queryState, keyword),
    [resultType, queryState, keyword]
  );

  const queryClient = useQueryClient();

  const query = useQuery<SearchResult>({
    queryKey: searchKeys.facets(resultType, apiUrl),
    queryFn: async ({ signal }) => {
      const response = await fetchFacetsAndResults(resultType, apiUrl, signal);
      return response ?? EMPTY_SEARCH_RESULT;
    },
    enabled: !!apiUrl,
    staleTime: 10_000,
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
  });

  // Prefetch next page when current page loads successfully
  const data = query.data;
  const hasNextPage = data ? data.offset + data.limit < data.count : false;
  useEffect(() => {
    if (!hasNextPage || !data) return;
    const nextOffset = data.offset + data.limit;
    const nextState = withOffset(queryState, nextOffset);
    const nextUrl = buildSearchRequestUrl(resultType, nextState, keyword);
    const nextKey = searchKeys.facets(resultType, nextUrl);
    queryClient.prefetchQuery({
      queryKey: nextKey,
      queryFn: async ({ signal }) => {
        const response = await fetchFacetsAndResults(resultType, nextUrl, signal);
        return response ?? EMPTY_SEARCH_RESULT;
      },
      staleTime: 10_000,
    });
  }, [hasNextPage, data, queryState, resultType, keyword, queryClient]);

  return {
    baseFacetURL,
    apiUrl,
    data: data ?? EMPTY_SEARCH_RESULT,
    isFetching: query.isFetching,
    isLoading: query.isLoading,
  };
}
