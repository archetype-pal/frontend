'use client';

import * as React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { buildSearchRequestUrl, fetchFacetsAndResults, searchKeys } from '@/utils/fetch-facets';
import { DEFAULT_QUERY, getSuggestionsPool } from '@/lib/search-query';

type SearchContextType = {
  suggestionsPool: string[];
  setSuggestionsPool: (pool: string[]) => void;
  /** Load a suggestions pool from the API so header autocomplete works from any page. */
  loadGlobalSuggestions: () => Promise<void>;
};

const SearchContext = React.createContext<SearchContextType | undefined>(undefined);

export function SearchProvider({ children }: { children: React.ReactNode }) {
  const [suggestionsPool, setSuggestionsPool] = React.useState<string[]>([]);
  const queryClient = useQueryClient();

  const loadGlobalSuggestions = React.useCallback(async () => {
    if (suggestionsPool.length > 0) return;
    const url = buildSearchRequestUrl('manuscripts', { ...DEFAULT_QUERY, limit: 100 }, '');
    const pool = await queryClient.fetchQuery({
      queryKey: searchKeys.globalSuggestions(),
      queryFn: async () => {
        const resp = await fetchFacetsAndResults('manuscripts', url);
        if (!resp || !Array.isArray(resp.results)) return [];
        return getSuggestionsPool(resp.results);
      },
      staleTime: 5 * 60_000,
    });
    setSuggestionsPool(pool);
  }, [queryClient, suggestionsPool.length]);

  const value = React.useMemo(
    () => ({ suggestionsPool, setSuggestionsPool, loadGlobalSuggestions }),
    [suggestionsPool, loadGlobalSuggestions]
  );
  return <SearchContext.Provider value={value}>{children}</SearchContext.Provider>;
}

export function useSearchContext() {
  const ctx = React.useContext(SearchContext);
  if (ctx === undefined) {
    throw new Error('useSearchContext must be used within a SearchProvider');
  }
  return ctx;
}
