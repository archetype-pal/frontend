'use client'

import * as React from 'react'
import { fetchFacetsAndResults } from '@/utils/fetch-facets'
import { buildApiUrl, DEFAULT_QUERY, getSuggestionsPool } from '@/lib/search-query'

type SearchContextType = {
  keyword: string
  setKeyword: (value: string) => void
  suggestionsPool: string[]
  setSuggestionsPool: (pool: string[]) => void
  /** Load a suggestions pool from the API so header autocomplete works from any page. */
  loadGlobalSuggestions: () => Promise<void>
}

const SearchContext = React.createContext<SearchContextType | undefined>(undefined)

export function SearchProvider({ children }: { children: React.ReactNode }) {
  const [keyword, setKeyword] = React.useState('')
  const [suggestionsPool, setSuggestionsPool] = React.useState<string[]>([])

  const loadGlobalSuggestions = React.useCallback(async () => {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL
    if (!baseUrl) return
    const base = `${baseUrl}/api/v1/search/item-parts/facets`
    const url = buildApiUrl(base, { ...DEFAULT_QUERY, limit: 100 })
    const resp = await fetchFacetsAndResults('manuscripts', url)
    if (resp.ok && Array.isArray(resp.results)) {
      setSuggestionsPool(getSuggestionsPool(resp.results))
    }
  }, [])

  const value = React.useMemo(
    () => ({ keyword, setKeyword, suggestionsPool, setSuggestionsPool, loadGlobalSuggestions }),
    [keyword, suggestionsPool, loadGlobalSuggestions]
  )
  return <SearchContext.Provider value={value}>{children}</SearchContext.Provider>
}

export function useSearchContext() {
  const ctx = React.useContext(SearchContext)
  if (ctx === undefined) {
    throw new Error('useSearchContext must be used within a SearchProvider')
  }
  return ctx
}
