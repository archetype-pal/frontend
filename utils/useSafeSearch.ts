import { useState, useRef, useCallback, useEffect } from 'react'
import { fetchFacetsAndResults, SafeSearchResponse } from './fetch-facets'
import { RESULT_TYPE_API_MAP } from '@/lib/api-path-map'

type SafeData = Omit<SafeSearchResponse, 'ok'>
const EMPTY: SafeData = { facets: {}, results: [], count: 0 }

export function useSafeSearch(resultType: string) {
  const [data, setData] = useState<SafeData>(EMPTY)
  const lastGood = useRef<SafeData>(EMPTY)

  const performSearch = useCallback(
    async (url?: string) => {
      if (!RESULT_TYPE_API_MAP[resultType]) return

      const resp = await fetchFacetsAndResults(resultType, url)
      if (resp.ok) {
        lastGood.current = {
          facets: resp.facets,
          results: resp.results,
          count: resp.count,
        }
        setData(lastGood.current)
      }
    },
    [resultType]
  )

  useEffect(() => {
    lastGood.current = EMPTY
    setData(EMPTY)

    if (RESULT_TYPE_API_MAP[resultType]) {
      performSearch()
    }
  }, [resultType, performSearch])

  return { data, search: performSearch }
}