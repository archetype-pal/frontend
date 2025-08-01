'use client'

import * as React from 'react'
import { Button } from '@/components/ui/button'
import { Grid, List } from 'lucide-react'
import { ResultTypeToggle } from '@/components/search/search-result-types'
import { ResultsTable } from '@/components/search/ResultsTable'
import { SearchGrid } from '@/components/search/search-grid'
import { DynamicFacets } from '@/components/filters/DynamicFacets'
import { FILTER_RENDER_MAP } from '@/lib/filter-config'
import { useSafeSearch } from '@/utils/useSafeSearch'
import { RESULT_TYPE_API_MAP } from '@/lib/api-path-map'
import { Pagination } from '@/components/search/paginated-search'

export function SearchPage() {
  const [viewMode, setViewMode] = React.useState<'table' | 'grid'>('table')
  const [resultType, setResultType] = React.useState<string>('manuscripts')
  const { data, search, lastURL } = useSafeSearch(resultType)
  const [limit, setLimit] = React.useState(20)

  const renderMap = FILTER_RENDER_MAP[resultType] ?? {}
  const hasMap = Boolean(RESULT_TYPE_API_MAP[resultType])
  const baseFacetURL = `${process.env.NEXT_PUBLIC_API_URL}/api/v1/search/${RESULT_TYPE_API_MAP[resultType]}/facets`
  const showGridToggle = resultType !== 'manuscripts';

  React.useEffect(() => {
    if (resultType === 'manuscripts' && viewMode !== 'table') {
      setViewMode('table')
    }
  }, [resultType, viewMode])

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

  return (
    <div className="h-screen bg-gray-50">
      <header className="px-6 py-4 border-b bg-white flex items-center justify-between">
        <h1 className="text-lg font-semibold">
          Search:{' '}
          {resultType.charAt(0).toUpperCase() + resultType.slice(1)} (
          {hasMap ? data.count : 0})
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
              onFacetClick={(url) => search(url)}
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
              onChange={(t) => setResultType(t)}
            />
          </div>
          <div className="p-6 overflow-auto flex-1">

            <>
              <div className="mt-4 flex justify-center border rounded-md bg-white py-2">
                <Pagination
                  count={data.count}
                  limit={data.limit}
                  offset={data.offset}
                  onPageChange={handlePage}
                  onLimitChange={handleLimitChange}
                />
              </div>

              {hasMap && data.results.length > 0 ? (
                viewMode === 'table' ? (
                  <ResultsTable
                    resultType={resultType}
                    results={data.results}
                  />
                ) : (
                  resultType === 'images' ? (
                    <SearchGrid results={data.results} resultType={resultType} />
                  ) : (
                    <div className="mt-8 text-center text-sm text-muted-foreground">
                      No Grid view mode available.
                    </div>
                  )
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
            </>

          </div>
        </main>
      </div>
    </div>
  )
}