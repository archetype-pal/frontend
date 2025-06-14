import { normalizeFacets } from './normalise-facets'
import { RESULT_TYPE_API_MAP } from '@/lib/api-path-map'
import type { FacetData } from '@/types/facets'

export type SafeSearchResponse = {
  facets: FacetData
  results: any[]
  count: number
  ok: boolean
}

export async function fetchFacetsAndResults(
  resultType: string,
  url?: string
): Promise<SafeSearchResponse> {
  const apiSegment = RESULT_TYPE_API_MAP[resultType]
  if (!apiSegment) {
    console.warn(`No API segment mapped for resultType "${resultType}"`)
    return { facets: {}, results: [], count: 0, ok: false }
  }

  const endpoint =
    url || `${process.env.NEXT_PUBLIC_API_URL}/api/v1/search/${apiSegment}/facets`

  let raw: any
  try {
    const res = await fetch(endpoint)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    raw = await res.json()
  } catch (e) {
    console.error('Fetch or JSON error:', e)
    return { facets: {}, results: [], count: 0, ok: false }
  }

  const fields = raw.fields ?? {}
  const facetArrays = Object.values(fields).filter(Array.isArray)
  const hasAnyFacetEntry = facetArrays.some(arr => arr.length > 0)

  const results: any[] = Array.isArray(raw.objects?.results)
    ? raw.objects.results
    : []
  const count: number = raw.objects?.count ?? results.length
  const hasAnyResult = count > 0

  if (!hasAnyFacetEntry && !hasAnyResult) {
    console.warn(
      'Empty payload (no facets AND no results)—treating as bad response'
    )
    return { facets: {}, results: [], count: 0, ok: false }
  }

  const facets: FacetData = normalizeFacets(fields)
  return { facets, results, count, ok: true }
}