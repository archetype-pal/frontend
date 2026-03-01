'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { RESULT_TYPE_API_MAP } from '@/lib/api-path-map';
import { API_BASE_URL } from '@/lib/api-fetch';
import { buildApiUrl, type QueryState } from '@/lib/search-query';
import { searchKeys } from '@/lib/search/query-keys';
import { fetchFacetsAndResults } from '@/utils/fetch-facets';
import type { FacetData } from '@/types/facets';

type SearchData = {
  facets: FacetData;
  results: unknown[];
  count: number;
  next: string | null;
  previous: string | null;
  limit: number;
  offset: number;
  ordering?: { current: string; options: Array<{ name: string; text: string; url: string }> };
};

const EMPTY: SearchData = {
  facets: {},
  results: [],
  count: 0,
  next: null,
  previous: null,
  limit: 20,
  offset: 0,
};

export function useSearchResults(resultType: string, queryState: QueryState) {
  const apiSegment = RESULT_TYPE_API_MAP[resultType];
  const hasMap = Boolean(apiSegment);
  const baseFacetURL = apiSegment ? `${API_BASE_URL}/api/v1/search/${apiSegment}/facets` : '';

  const apiUrl = useMemo(() => {
    if (!baseFacetURL) return '';
    return buildApiUrl(baseFacetURL, queryState);
  }, [baseFacetURL, queryState]);

  const query = useQuery({
    queryKey: searchKeys.facets(resultType, queryState),
    queryFn: async () => {
      if (!hasMap || !apiUrl) return EMPTY;
      const response = await fetchFacetsAndResults(resultType, apiUrl);
      if (!response.ok) return EMPTY;
      const { facets, results, count, next, previous, limit, offset, ordering } = response;
      return {
        facets,
        results,
        count,
        next,
        previous,
        limit,
        offset,
        ordering,
      } satisfies SearchData;
    },
    enabled: hasMap && !!apiUrl,
    staleTime: 10_000,
  });

  return {
    hasMap,
    baseFacetURL,
    apiUrl,
    data: query.data ?? EMPTY,
    isFetching: query.isFetching,
  };
}
