'use client';

import { useMemo } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { API_BASE_URL } from '@/lib/api-fetch';
import { SEARCH_RESULT_CONFIG, type ResultType } from '@/lib/search-types';
import {
  buildApiUrl,
  normalizeKeyword,
  normalizeQueryState,
  type QueryState,
} from '@/lib/search-query';
import {
  EMPTY_SEARCH_RESULT,
  fetchFacetsAndResults,
  type SearchResult,
} from '@/utils/fetch-facets';

const searchKeys = {
  all: ['search'] as const,
  resultType: (resultType: ResultType) => [...searchKeys.all, resultType] as const,
  facets: (resultType: ResultType, querySignature: string) =>
    [...searchKeys.resultType(resultType), 'facets', querySignature] as const,
} as const;

export function useSearchResults(resultType: ResultType, queryState: QueryState, keyword: string) {
  const apiSegment = SEARCH_RESULT_CONFIG[resultType].apiPath;
  const baseFacetURL = `${API_BASE_URL}/api/v1/search/${apiSegment}/facets`;
  const normalizedQueryState = useMemo(() => normalizeQueryState(queryState), [queryState]);
  const normalizedKeyword = useMemo(() => normalizeKeyword(keyword), [keyword]);

  const apiUrl = useMemo(
    () => buildApiUrl(baseFacetURL, normalizedQueryState, normalizedKeyword),
    [baseFacetURL, normalizedQueryState, normalizedKeyword]
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
