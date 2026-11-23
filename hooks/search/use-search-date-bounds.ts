'use client';

import { useQuery } from '@tanstack/react-query';
import { getDateFacet, type ResultType } from '@/lib/search-types';
import { fetchDateBounds, searchKeys, type DateBounds } from '@/utils/fetch-facets';

export function useSearchDateBounds(
  resultType: ResultType,
  visibleFacets: readonly string[]
): DateBounds | null {
  const dateFacet = getDateFacet(resultType);
  const query = useQuery({
    queryKey: searchKeys.dateBounds(resultType),
    queryFn: ({ signal }) => fetchDateBounds(resultType, signal),
    enabled: dateFacet !== undefined && visibleFacets.includes(dateFacet.key),
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    retry: false,
  });
  return query.data ?? null;
}
