'use client';

import { useQuery } from '@tanstack/react-query';
import { getDateFacets, type ResultType } from '@/lib/search-types';
import { fetchDateBounds, searchKeys, type DateBoundsByFacet } from '@/utils/fetch-facets';

export function useSearchDateBounds(resultType: ResultType): DateBoundsByFacet | null {
  const query = useQuery({
    queryKey: searchKeys.dateBounds(resultType),
    queryFn: ({ signal }) => fetchDateBounds(resultType, signal),
    enabled: getDateFacets(resultType).length > 0,
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    retry: false,
  });
  return query.data ?? null;
}
