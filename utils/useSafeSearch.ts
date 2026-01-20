import { useState, useRef, useCallback, useEffect } from 'react'
import { fetchFacetsAndResults, SafeSearchResponse } from './fetch-facets'
import { RESULT_TYPE_API_MAP } from '@/lib/api-path-map'

type SafeData = Omit<SafeSearchResponse, 'ok'>

const EMPTY: SafeData = {
  facets: {},
  results: [],
  count: 0,
  next: null,
  previous: null,
  limit: 20,
  offset: 0,
}

export function useSafeSearch(resultType: string, apiUrl: string): { data: SafeData } {
  const [data, setData] = useState<SafeData>(EMPTY)
  const prevResultType = useRef<string>(resultType)

  const performSearch = useCallback(
    async (url: string, signal?: AbortSignal) => {
      if (!RESULT_TYPE_API_MAP[resultType]) return
      const resp = await fetchFacetsAndResults(resultType, url, signal)
      if (resp.ok) {
        const { facets, results, count, next, previous, limit, offset, ordering } = resp
        setData({ facets, results, count, next, previous, limit, offset, ordering })
      }
    },
    [resultType]
  )

  useEffect(() => {
    if (!RESULT_TYPE_API_MAP[resultType]) {
      setData(EMPTY)
      return
    }
    if (prevResultType.current !== resultType) {
      prevResultType.current = resultType
      setData(EMPTY)
    }
    const ac = new AbortController()
    performSearch(apiUrl, ac.signal)
    return () => ac.abort()
  }, [resultType, apiUrl, performSearch])

  return { data }
}