'use client';

import { useQuery } from '@tanstack/react-query';
import { getFacetOrder, type ResultType } from '@/lib/search-types';
import { fetchDateBounds, searchKeys, type DateBounds } from '@/utils/fetch-facets';

export function useSearchDateBounds(resultType: ResultType): DateBounds | null {
  const query = useQuery({
    queryKey: searchKeys.dateBounds(resultType),
    queryFn: ({ signal }) => fetchDateBounds(resultType, signal),
    enabled: getFacetOrder(resultType).includes('text_date'),
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    retry: false,
  });
  return query.data ?? null;
}
