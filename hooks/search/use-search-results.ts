'use client';

import { useMemo } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import type { ResultType } from '@/lib/search-types';
import { type QueryState } from '@/lib/search-query';
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

  return {
    baseFacetURL,
    apiUrl,
    data: query.data ?? EMPTY_SEARCH_RESULT,
    isFetching: query.isFetching,
  };
}
