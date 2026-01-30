import { useState, useCallback, useEffect } from 'react'
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
  const [state, setState] = useState<{ data: SafeData; resultType: string }>({
    data: EMPTY,
    resultType: '',
  })

  const performSearch = useCallback(
    async (url: string, signal?: AbortSignal) => {
      if (!RESULT_TYPE_API_MAP[resultType]) return
      const resp = await fetchFacetsAndResults(resultType, url, signal)
      if (resp.ok) {
        const { facets, results, count, next, previous, limit, offset, ordering } = resp
        setState({
          data: { facets, results, count, next, previous, limit, offset, ordering },
          resultType,
        })
      }
    },
    [resultType]
  )

  useEffect(() => {
    if (!RESULT_TYPE_API_MAP[resultType]) return
    const ac = new AbortController()
    queueMicrotask(() => performSearch(apiUrl, ac.signal))
    return () => ac.abort()
  }, [resultType, apiUrl, performSearch])

  const data =
    state.resultType === resultType && RESULT_TYPE_API_MAP[resultType]
      ? state.data
      : EMPTY
  return { data }
}