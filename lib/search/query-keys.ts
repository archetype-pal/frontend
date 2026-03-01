import type { QueryState } from '@/lib/search-query';

export const searchKeys = {
  all: ['search'] as const,
  resultType: (resultType: string) => [...searchKeys.all, resultType] as const,
  facets: (resultType: string, query: QueryState) =>
    [...searchKeys.resultType(resultType), 'facets', query] as const,
} as const;
