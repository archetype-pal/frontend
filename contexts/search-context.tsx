'use client';

import * as React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { buildSearchRequestUrl, fetchFacetsAndResults, searchKeys } from '@/utils/fetch-facets';
import { DEFAULT_QUERY, getSuggestionsPool } from '@/lib/search-query';
import { API_BASE_URL } from '@/lib/api-fetch';
import type { ResultType } from '@/lib/search-types';
import type { KeywordSuggestionItem } from '@/components/search/keyword-search-input';

type SearchContextType = {
  suggestionsPool: string[];
  setSuggestionsPool: (pool: string[]) => void;
  /** Load a suggestions pool from the API so header autocomplete works from any page. */
  loadGlobalSuggestions: () => Promise<void>;
  getServerSuggestions: (query: string, types?: ResultType[]) => Promise<KeywordSuggestionItem[]>;
};

const SearchContext = React.createContext<SearchContextType | undefined>(undefined);

export function SearchProvider({ children }: { children: React.ReactNode }) {
  const [suggestionsPool, setSuggestionsPool] = React.useState<string[]>([]);
  const globalLoadRequestedRef = React.useRef(false);
  const queryClient = useQueryClient();

  const loadGlobalSuggestions = React.useCallback(async () => {
    if (suggestionsPool.length > 0 || globalLoadRequestedRef.current) return;
    globalLoadRequestedRef.current = true;
    const url = buildSearchRequestUrl('manuscripts', { ...DEFAULT_QUERY, limit: 100 }, '');
    try {
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
    } finally {
      globalLoadRequestedRef.current = false;
    }
  }, [queryClient, suggestionsPool.length]);

  React.useEffect(() => {
    void loadGlobalSuggestions();
  }, [loadGlobalSuggestions]);

  const getServerSuggestions = React.useCallback(
    async (query: string, types?: ResultType[]) => {
      const normalized = query.trim();
      if (normalized.length < 2) return [];
      try {
        const params = new URLSearchParams({
          q: normalized,
          limit: '4',
        });
        if (types && types.length > 0) {
          params.set('types', types.map((type) => type.replace('_', '-')).join(','));
        }
        const path = `/api/v1/search/suggest/?${params.toString()}`;

        const data = await queryClient.fetchQuery({
          queryKey: searchKeys.suggestions(path),
          queryFn: async () => {
            const res = await fetch(`${API_BASE_URL}${path}`, { cache: 'no-store' });
            if (!res.ok) return [] as KeywordSuggestionItem[];
            const json = (await res.json()) as {
              suggestions?: Record<string, Array<{ id: string | number; label: string }>>;
            };
            const grouped = json.suggestions ?? {};
            const flattened: KeywordSuggestionItem[] = [];
            for (const [type, items] of Object.entries(grouped)) {
              for (const item of items) {
                const label = String(item.label || '').trim();
                if (!label) continue;
                flattened.push({
                  id: `${type}:${item.id}`,
                  label,
                  value: label,
                  type: type.replace('-', '_') as ResultType,
                });
              }
            }
            if (flattened.length > 0) {
              flattened.push({
                id: `all:${normalized}`,
                label: `Search all for "${normalized}"`,
                value: normalized,
                type: 'all',
              });
            }
            return flattened.slice(0, 16);
          },
          staleTime: 30_000,
        });
        return data;
      } catch {
        return [];
      }
    },
    [queryClient]
  );

  const value = React.useMemo(
    () => ({ suggestionsPool, setSuggestionsPool, loadGlobalSuggestions, getServerSuggestions }),
    [suggestionsPool, loadGlobalSuggestions, getServerSuggestions]
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
