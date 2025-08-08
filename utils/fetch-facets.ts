import { normalizeFacets } from './normalise-facets'
import { RESULT_TYPE_API_MAP } from '@/lib/api-path-map'
import type { FacetData } from '@/types/facets'

export type SafeSearchResponse = {
  facets: FacetData
  results: any[]
  count: number
  next: string | null
  previous: string | null
  limit: number
  offset: number
  ok: boolean
  ordering?: {
    current: string
    options: Array<{
      name: string
      text: string
      url: string
    }>
  }
}

export async function fetchFacetsAndResults(
  resultType: string,
  url?: string
): Promise<SafeSearchResponse> {
  const apiSegment = RESULT_TYPE_API_MAP[resultType]
  if (!apiSegment) {
    console.warn(`No API segment mapped for resultType "${resultType}"`)
    return { facets: {}, results: [], count: 0,  next: null, previous: null, limit: 0, offset: 0, ok: false }
  }

  const endpoint =
    url || `${process.env.NEXT_PUBLIC_API_URL}/api/v1/search/${apiSegment}/facets`

  const parsed = new URL(endpoint)
  const limit = parseInt(parsed.searchParams.get('limit')  || '20', 10)
  const offset = parseInt(parsed.searchParams.get('offset') || '0', 10)

  let raw: any
  try {
    const res = await fetch(endpoint)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    raw = await res.json()
  } catch (e) {
    console.error('Fetch or JSON error:', e)
    return { facets: {}, results: [], count: 0,  next: null, previous: null, limit: 0, offset: 0, ok: false }
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
    return { facets: {}, results: [], count: 0,  next: null, previous: null, limit: 0, offset: 0, ok: false }
  }

  const next: string | null     = raw.objects?.next     ?? null
  const previous: string | null = raw.objects?.previous ?? null

  const facets: FacetData = normalizeFacets(fields)
  const ordering = raw.objects?.ordering ?? raw.ordering
  return { facets, results, count, next, previous, limit, offset, ok: true, ordering }

}