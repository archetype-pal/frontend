'use client'

import * as React from 'react'
import { Button } from '@/components/ui/button'
import { Grid, List } from 'lucide-react'
import { ResultTypeToggle } from '@/components/search-result-types'
import { ManuscriptsTable } from '@/components/search-table'
import { DynamicFacets } from '@/components/search/DynamicFacets'
import { FILTER_RENDER_MAP } from '@/lib/filter-config'
import { fetchFacetsAndResults } from '@/utils/fetch-facets'
import { RESULT_TYPE_API_MAP } from '@/lib/api-path-map'
import type { ManuscriptListItem } from '@/types/manuscript'

export function SearchPage() {
  const [, setViewMode] = React.useState<'table' | 'grid'>('table')
  const [resultType, setResultType] = React.useState<string>('manuscripts')
  const [facetData, setFacetData] = React.useState<Record<string, any>>({})
  const [tableResults, setTableResults] = React.useState<ManuscriptListItem[]>([])

  const renderMap = FILTER_RENDER_MAP[resultType] ?? {}

  const loadData = async (url?: string) => {
    const { facets, results } = await fetchFacetsAndResults(resultType, url)
    setFacetData(facets)
    setTableResults(results)
  }

  React.useEffect(() => {
    if (RESULT_TYPE_API_MAP[resultType]) {
      loadData()
    } else {
      setFacetData({})
      setTableResults([])
    }
  }, [resultType])

  const handleFacetClick = (url: string) => {
    loadData(url)
  }

  return (
    <div className="h-screen bg-gray-50">
      <div className="px-6 py-4 border-b bg-white flex items-center justify-between">
        <h1 className="text-lg font-semibold">Search: {resultType.charAt(0).toUpperCase() + resultType.slice(1)}</h1>
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
            // <DynamicFacets
            //   facets={facetData}
            //   renderConfig={renderMap}
            //   onFacetClick={handleFacetClick}
            // />
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
