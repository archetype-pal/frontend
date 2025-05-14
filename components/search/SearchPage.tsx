'use client'

import * as React from 'react'
import { Button } from '@/components/ui/button'
import { Grid, List } from 'lucide-react'
import { ResultTypeToggle } from '@/components/search/search-result-types'
import { ManuscriptsTable } from '@/components/search/search-table'
import { DynamicFacets } from '@/components/filters/DynamicFacets'
import { FILTER_RENDER_MAP } from '@/lib/filter-config'
import { fetchFacetsAndResults } from '@/utils/fetch-facets'
import { RESULT_TYPE_API_MAP } from '@/lib/api-path-map'
import type { ManuscriptListItem } from '@/types/manuscript'
import type { FacetData } from '@/types/facets'

export function SearchPage() {
  const [, setViewMode] = React.useState<'table' | 'grid'>('table')
  const [resultType, setResultType] = React.useState<string>('manuscripts')
  const [facetData, setFacetData] = React.useState<FacetData>({})
  const [tableResults, setTableResults] = React.useState<ManuscriptListItem[]>([])
  const [totalCount, setTotalCount] = React.useState<number>(0)

  const renderMap = FILTER_RENDER_MAP[resultType] ?? {}

  const loadData = React.useCallback(async (url?: string) => {
    const { facets, results, count } = await fetchFacetsAndResults(resultType, url)
    setTotalCount(count)
    setFacetData(facets)
    setTableResults(results)
  }, [resultType])

  React.useEffect(() => {
    if (RESULT_TYPE_API_MAP[resultType]) {
      loadData()
    } else {
      setFacetData({})
      setTableResults([])
    }
  }, [loadData])

  const handleFacetClick = (url: string) => {
    loadData(url)
  }

  return (
    <div className="h-screen bg-gray-50">
      <div className="px-6 py-4 border-b bg-white flex items-center justify-between">
        <h1 className="text-lg font-semibold">Search: {resultType.charAt(0).toUpperCase() + resultType.slice(1)} ({totalCount})</h1>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => setViewMode('grid')}>
            <Grid className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setViewMode('table')}>
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex h-[calc(100vh-73px)]">
        <div className="w-64 border-r bg-white p-4 overflow-y-auto">
          {Object.keys(facetData).length > 0 ? (
            <DynamicFacets
              facets={facetData}
              renderConfig={{ ...renderMap, searchType: resultType }}
              onFacetClick={handleFacetClick}
            />

          ) : (
            <div className="text-sm text-muted-foreground">No filters for this type</div>
          )}
        </div>

        <div className="flex flex-1 flex-col">
          <div className="p-4 border-b bg-white grid content-center">
            <ResultTypeToggle selectedType={resultType} onChange={setResultType} />
          </div>
          <div className="p-6 overflow-auto">
            <ManuscriptsTable results={tableResults} />
          </div>
        </div>
      </div>
    </div>
  )
}
