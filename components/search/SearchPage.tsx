'use client'

import * as React from 'react'
import { Button } from '@/components/ui/button'
import { Grid, List } from 'lucide-react'
import { ResultTypeToggle, ResultType } from '@/components/search/search-result-types'
import { ResultsTable } from '@/components/search/ResultsTable'
import { SearchGrid } from '@/components/search/search-grid'
import { DynamicFacets } from '@/components/filters/DynamicFacets'
import { FILTER_RENDER_MAP } from '@/lib/filter-config'
import { useSafeSearch } from '@/utils/useSafeSearch'
import { RESULT_TYPE_API_MAP } from '@/lib/api-path-map'
import { Pagination } from '@/components/search/paginated-search'

export function SearchPage() {
  const [viewMode, setViewMode] = React.useState<'table' | 'grid'>('table')
  const [resultType, setResultType] = React.useState<ResultType>('manuscripts')
  const { data, search, lastURL } = useSafeSearch(resultType)
  const [limit, setLimit] = React.useState(20)
  const [sortKey, setSortKey] = React.useState<string | null>(null)
  const [ascending, setAscending] = React.useState(true)

  const [keyword, setKeyword] = React.useState('')
  const [filtered, setFiltered] = React.useState(data.results)

  const pool = React.useMemo(() => {
    return Array.from(
      new Set(
        data.results
          .flatMap((r) =>
            Object.values(r)
              .filter((v) => typeof v === 'string' || typeof v === 'number')
              .map((v) => String(v))
          )
      )
    )
  }, [data.results])

  React.useEffect(() => {
    if (resultType === 'manuscripts' && viewMode !== 'table') {
      setViewMode('table')
    }
    setKeyword('')
  }, [resultType, viewMode])

  React.useEffect(() => {
    if (!keyword) {
      setFiltered(data.results)
    } else {
      const low = keyword.toLowerCase()
      setFiltered(
        data.results.filter((row) =>
          Object.values(row).some((v) =>
            ['string', 'number'].includes(typeof v)
              ? String(v).toLowerCase().includes(low)
              : false
          )
        )
      )
    }
  }, [data.results, keyword])

  const renderMap = FILTER_RENDER_MAP[resultType] ?? {}
  const hasMap = Boolean(RESULT_TYPE_API_MAP[resultType])
  const baseFacetURL = `${process.env.NEXT_PUBLIC_API_URL}/api/v1/search/${RESULT_TYPE_API_MAP[resultType]}/facets`
  const showGridToggle = resultType !== 'manuscripts'

  const handlePage = (page: number) => {
    const offset = (page - 1) * limit
    const url = new URL(lastURL.current || baseFacetURL)
    url.searchParams.set('offset', String(offset))
    url.searchParams.set('limit', String(limit))
    search(url.toString())
  }

  const handleLimitChange = (newLimit: number) => {
    setLimit(newLimit)
    const url = new URL(lastURL.current || baseFacetURL)
    url.searchParams.set('limit', String(newLimit))
    url.searchParams.set('offset', '0')
    search(url.toString())
  }

  const handleSort = React.useCallback(
    (opts: { sortKey?: string; sortUrl?: string }) => {
      const { sortKey: ck, sortUrl } = opts
      if (sortUrl && data.ordering) {
        const group = data.ordering.options.filter((o) =>
          o.name.endsWith(ck!)
        )
        const next = group.find((o) => o.name !== data.ordering!.current) || group[0]
        return search(next.url)
      } else if (sortUrl) {
        return search(sortUrl)
      }
      if (ck) {
        const same = ck === sortKey
        const nextAsc = same ? !ascending : true
        setSortKey(ck)
        setAscending(nextAsc)
        const param = `${nextAsc ? '' : '-'}${ck}`
        const url = new URL(lastURL.current || baseFacetURL)
        url.searchParams.set('ordering', param)
        url.searchParams.set('offset', '0')
        return search(url.toString())
      }
    },
    [search, data.ordering, sortKey, ascending, lastURL, baseFacetURL]
  )

  return (
    <div className="h-screen bg-gray-50">
      <header className="px-6 py-4 border-b bg-white flex items-center justify-between">
        <h1 className="text-lg font-semibold">
          Search:{' '}
          {resultType.charAt(0).toUpperCase() + resultType.slice(1)} (
          {keyword ? filtered.length : data.count})
        </h1>
        <div className="flex gap-2">
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

      <div className="flex h-[calc(100vh-73px)]">
        <aside className="w-64 border-r bg-white p-4 overflow-y-auto">
          {hasMap && Object.keys(data.facets).length > 0 ? (
            <DynamicFacets
              facets={data.facets}
              renderConfig={{ ...renderMap, searchType: resultType }}
              suggestionsPool={pool}
              onFacetClick={(arg) => {
                if (arg.startsWith('http')) {
                  search(arg)
                } else {
                  setKeyword(arg)
                }
              }}
              baseFacetURL={baseFacetURL}
            />
          ) : (
            <div className="text-sm text-muted-foreground">
              No filters for this type
            </div>
          )}
        </aside>

        <main className="flex-1 flex flex-col">
          <div className="p-4 border-b bg-white">
            <ResultTypeToggle
              selectedType={resultType}
              onChange={setResultType}
            />
          </div>
          <div className="p-6 overflow-auto flex-1">
            <div className="mt-4 flex justify-center border rounded-md bg-white py-2">
              <Pagination
                count={data.count}
                limit={data.limit}
                offset={data.offset}
                onPageChange={handlePage}
                onLimitChange={handleLimitChange}
              />
            </div>

            {hasMap && filtered.length > 0 ? (
              viewMode === 'table' ? (
                <ResultsTable
                  resultType={resultType}
                  results={filtered}
                  ordering={data.ordering}
                  onSort={handleSort}
                  highlightKeyword={keyword}
                />
              ) : resultType === 'images' ? (
                <SearchGrid
                  results={filtered}
                  resultType={resultType}
                  highlightKeyword={keyword}
                />
              ) : (
                <div className="mt-8 text-center text-sm text-muted-foreground">
                  No Grid view mode available.
                </div>
              )
            ) : (
              <p className="text-center text-sm text-muted-foreground">
                No results to display.
              </p>
            )}

            <div className="mt-4 flex justify-center border rounded-md bg-white py-2">
              <Pagination
                count={data.count}
                limit={data.limit}
                offset={data.offset}
                onPageChange={handlePage}
                onLimitChange={handleLimitChange}
              />
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
