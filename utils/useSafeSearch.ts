import { useState, useRef, useCallback, useEffect } from 'react'
import { fetchFacetsAndResults, SafeSearchResponse } from './fetch-facets'
import { RESULT_TYPE_API_MAP } from '@/lib/api-path-map'

type SafeData = Omit<SafeSearchResponse, 'ok'>
const EMPTY: SafeData = { facets: {}, results: [], count: 0, next: null, previous: null, limit: 20, offset: 0,}

export function useSafeSearch(resultType: string) {
  const [data, setData] = useState<SafeData>(EMPTY)
  const lastGood = useRef<SafeData>(EMPTY)
  const lastURL = useRef<string | undefined>()

  const performSearch = useCallback(
    async (url?: string) => {
      if (!RESULT_TYPE_API_MAP[resultType]) return
      lastURL.current = url

      const resp = await fetchFacetsAndResults(resultType, url)
      if (resp.ok) {
        const { facets, results, count, next, previous, limit, offset } = resp
        lastGood.current = { facets, results, count, next, previous, limit, offset }
        setData(lastGood.current)
      }
    },
    [resultType]
  )

  useEffect(() => {
    lastGood.current = EMPTY
    lastURL.current = undefined
    setData(EMPTY)

    if (RESULT_TYPE_API_MAP[resultType]) {
      performSearch()
    }
  }, [resultType, performSearch])

  return { data, search: performSearch, lastURL }
}