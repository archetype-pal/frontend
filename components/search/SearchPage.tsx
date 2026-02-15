'use client'

import * as React from 'react'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Grid, List } from 'lucide-react'
import { ResultTypeToggle, type ResultType } from '@/components/search/search-result-types'
import { ResultsTable } from '@/components/search/ResultsTable'
import { SearchGrid } from '@/components/search/search-grid'
import { DynamicFacets } from '@/components/filters/DynamicFacets'
import { useSearchContext } from '@/contexts/search-context'
import { FILTER_RENDER_MAP } from '@/lib/filter-config'
import { useSafeSearch } from '@/utils/useSafeSearch'
import { RESULT_TYPE_API_MAP } from '@/lib/api-path-map'
import { API_BASE_URL } from '@/lib/api-fetch'
import { Pagination } from '@/components/search/paginated-search'
import type { FacetClickOpts } from '@/types/facets'
import type { ImageListItem } from '@/types/image'
import type { GraphListItem } from '@/types/graph'
import type { ManuscriptListItem } from '@/types/manuscript'
import type { HandListItem } from '@/types/hand'
import type { ScribeListItem } from '@/types/scribe'
import type { TextListItem } from '@/types/text'
import type { PersonListItem } from '@/types/person'
import type { PlaceListItem } from '@/types/place'
import {
  buildApiUrl,
  buildQueryString,
  stateFromUrl,
  stateFromSearchParams,
  parseDateParamsFromUrl,
  formatTypeLabel,
  filterResultsByKeyword,
  getSuggestionsPool,
  type QueryState,
} from '@/lib/search-query'

type ResultListItem = ImageListItem | GraphListItem | ManuscriptListItem | HandListItem | ScribeListItem | TextListItem | PersonListItem | PlaceListItem

const TABLE_ONLY_TYPES: readonly string[] = ['manuscripts', 'texts', 'people', 'places']

export function SearchPage({ resultType: initialType }: { resultType?: ResultType } = {}) {
  const searchParams = useSearchParams()
  const [viewMode, setViewMode] = React.useState<'table' | 'grid'>('table')
  const [resultType, setResultType] = React.useState<ResultType>(initialType ?? 'manuscripts')
  const [queryState, setQueryState] = React.useState<QueryState>(() => stateFromSearchParams(searchParams))
  const [sortKey, setSortKey] = React.useState<string | null>(null)
  const [ascending, setAscending] = React.useState(true)
  const { keyword, setKeyword, setSuggestionsPool } = useSearchContext()

  React.useEffect(() => {
    if (initialType != null) setResultType(initialType)
  }, [initialType])

  React.useEffect(() => {
    const kw = searchParams.get('keyword')
    setKeyword(kw ?? '')
  }, [searchParams, setKeyword])

  React.useEffect(() => {
    const qs = buildQueryString(queryState)
    const params = new URLSearchParams(qs)
    if (keyword) params.set('keyword', keyword)
    const path = '/search/' + resultType + (params.toString() ? '?' + params.toString() : '')
    window.history.replaceState(null, '', path)
  }, [resultType, queryState, keyword])

  const handleResultTypeChange = React.useCallback((next: ResultType) => {
    setResultType(next)
    setQueryState((prev) => ({ ...prev, selected_facets: [], dateParams: {}, offset: 0 }))
  }, [])

  const hasMap = Boolean(RESULT_TYPE_API_MAP[resultType])
  const apiSegment = RESULT_TYPE_API_MAP[resultType]
  const baseFacetURL = apiSegment
    ? `${API_BASE_URL}/api/v1/search/${apiSegment}/facets`
    : ''
  const apiUrl = React.useMemo(() => {
    if (!baseFacetURL) return ''
    return buildApiUrl(baseFacetURL, queryState)
  }, [baseFacetURL, queryState])
  const { data } = useSafeSearch(resultType, apiUrl)

  const filtered = React.useMemo(
    () => filterResultsByKeyword(data.results, keyword),
    [data.results, keyword]
  )

  React.useEffect(() => {
    setSuggestionsPool(getSuggestionsPool(data.results))
    return () => setSuggestionsPool([])
  }, [data.results, setSuggestionsPool])

  React.useEffect(() => {
    if (TABLE_ONLY_TYPES.includes(resultType) && viewMode !== 'table') setViewMode('table')
  }, [resultType, viewMode])

  const handleFacetClick = React.useCallback(
    (arg: string, opts?: FacetClickOpts) => {
      if (!arg.startsWith('http') && !arg.startsWith('/')) {
        setKeyword(arg)
        return
      }
      if (opts?.merge) {
        setQueryState((prev) => ({
          ...prev,
          dateParams: parseDateParamsFromUrl(arg, baseFacetURL),
          offset: 0,
        }))
        return
      }
      if (opts?.isDeselect && opts.facetKey != null && opts.value != null) {
        const toRemove = `${opts.facetKey}_exact:${opts.value}`
        setQueryState((prev) => ({
          ...prev,
          selected_facets: prev.selected_facets.filter((s) => s !== toRemove),
          offset: 0,
        }))
        return
      }
      if (opts?.facetKey != null && opts.value != null) {
        const entry = `${opts.facetKey}_exact:${opts.value}`
        setQueryState((prev) => {
          const key = opts.facetKey!
          const without = prev.selected_facets.filter((s) => !s.startsWith(`${key}_exact:`))
          return { ...prev, selected_facets: without.includes(entry) ? without : [...without, entry], offset: 0 }
        })
      }
    },
    [baseFacetURL, setKeyword]
  )

  const handlePage = React.useCallback((page: number) => {
    setQueryState((prev) => ({ ...prev, offset: (page - 1) * prev.limit }))
  }, [])

  const handleLimitChange = React.useCallback((newLimit: number) => {
    setQueryState((prev) => ({ ...prev, limit: newLimit, offset: 0 }))
  }, [])

  const handleSort = React.useCallback(
    (opts: { sortKey?: string; sortUrl?: string }) => {
      const { sortKey: ck, sortUrl } = opts
      if (sortUrl && data.ordering) {
        const group = data.ordering.options.filter((o) => o.name.endsWith(ck ?? ''))
        const next = group.find((o) => o.name !== data.ordering!.current) ?? group[0]
        if (next?.url) {
          setQueryState(stateFromUrl(next.url, baseFacetURL))
          return
        }
      }
      if (sortUrl) {
        setQueryState(stateFromUrl(sortUrl, baseFacetURL))
        return
      }
      if (ck) {
        const nextAsc = ck === sortKey ? !ascending : true
        setSortKey(ck)
        setAscending(nextAsc)
        setQueryState((prev) => ({ ...prev, ordering: `${nextAsc ? '' : '-'}${ck}`, offset: 0 }))
      }
    },
    [data.ordering, sortKey, ascending, baseFacetURL]
  )

  const renderMap = FILTER_RENDER_MAP[resultType] ?? {}
  const showGridToggle = !TABLE_ONLY_TYPES.includes(resultType)
  const resultCount = keyword ? filtered.length : data.count

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <header className="shrink-0 px-6 py-3 border-b bg-white flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-lg font-semibold shrink-0">
          Search: {formatTypeLabel(resultType)} ({resultCount})
        </h1>
        <div className="flex-1 min-w-0 flex items-center px-2">
          <ResultTypeToggle selectedType={resultType} onChange={handleResultTypeChange} compact />
        </div>
        <div className="flex gap-2 shrink-0">
          <Button
            variant={viewMode === 'table' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('table')}
          >
            <List className="h-4 w-4" />
          </Button>
          {showGridToggle && (
            <Button
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
            >
              <Grid className="h-4 w-4" />
            </Button>
          )}
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        <aside className="w-64 shrink-0 border-r bg-white py-4 px-4 overflow-y-auto">
          {hasMap && Object.keys(data.facets).length > 0 ? (
            <DynamicFacets
              facets={data.facets}
              renderConfig={{ ...renderMap, searchType: resultType }}
              selectedFacets={queryState.selected_facets}
              onFacetClick={handleFacetClick}
              baseFacetURL={baseFacetURL}
            />
          ) : (
            <div className="text-sm text-muted-foreground">No filters for this type</div>
          )}
        </aside>

        <main className="flex-1 flex flex-col min-w-0">
          <div className="p-4 overflow-auto flex-1 flex flex-col gap-4">
            {hasMap && filtered.length > 0 ? (
              viewMode === 'table' ? (
                <ResultsTable
                  resultType={resultType}
                  results={filtered as ResultListItem[]}
                  ordering={data.ordering}
                  onSort={handleSort}
                  highlightKeyword={keyword}
                />
              ) : resultType === 'images' || resultType === 'graphs' ? (
                <SearchGrid
                  results={filtered as (ImageListItem | GraphListItem)[]}
                  resultType={resultType}
                  highlightKeyword={keyword}
                />
              ) : (
                <p className="text-center text-sm text-muted-foreground py-8">
                  No Grid view mode available.
                </p>
              )
            ) : (
              <p className="text-center text-sm text-muted-foreground py-8">No results to display.</p>
            )}

            {data.count > 0 && (
              <div className="shrink-0 flex justify-center border rounded-md bg-white py-2 px-4">
                <Pagination
                  count={data.count}
                  limit={queryState.limit}
                  offset={queryState.offset}
                  onPageChange={handlePage}
                  onLimitChange={handleLimitChange}
                />
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
