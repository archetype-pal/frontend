import { normalizeFacets } from './normalise-facets'
import { RESULT_TYPE_API_MAP } from '@/lib/api-path-map'
import type { FacetData } from '@/types/facets'

export type SafeSearchResponse = {
  facets: FacetData
  results: unknown[]
  count: number
  next: string | null
  previous: string | null
  limit: number
  offset: number
  ok: boolean
  ordering?: { current: string; options: Array<{ name: string; text: string; url: string }> }
}

const BAD_RESPONSE: SafeSearchResponse = {
  facets: {},
  results: [],
  count: 0,
  next: null,
  previous: null,
  limit: 0,
  offset: 0,
  ok: false,
}

export async function fetchFacetsAndResults(
  resultType: string,
  url?: string,
  signal?: AbortSignal
): Promise<SafeSearchResponse> {
  const apiSegment = RESULT_TYPE_API_MAP[resultType]
  if (!apiSegment) {
    console.warn(`No API segment mapped for resultType "${resultType}"`)
    return BAD_RESPONSE
  }

  const endpoint =
    url || `${process.env.NEXT_PUBLIC_API_URL}/api/v1/search/${apiSegment}/facets`

  const parsed = new URL(endpoint)
  const limit = parseInt(parsed.searchParams.get('limit') || '20', 10)
  const offset = parseInt(parsed.searchParams.get('offset') || '0', 10)

  let raw: unknown
  try {
    const res = await fetch(endpoint, { cache: 'no-store', signal })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    raw = await res.json()
  } catch (e) {
    if ((e as DOMException)?.name === 'AbortError') return BAD_RESPONSE
    console.error('Fetch or JSON error:', e)
    return BAD_RESPONSE
  }

  const rawObj = raw as { fields?: Record<string, unknown>; objects?: { results?: unknown[]; count?: number; next?: string | null; previous?: string | null; ordering?: SafeSearchResponse['ordering'] } }
  const fields = rawObj.fields ?? {}
  const facetArrays = Object.values(fields).filter(Array.isArray)
  const hasAnyFacetEntry = facetArrays.some((arr) => (arr as unknown[]).length > 0)

  const results: unknown[] = Array.isArray(rawObj.objects?.results) ? rawObj.objects.results : []
  const count = rawObj.objects?.count ?? results.length
  const hasAnyResult = count > 0

  if (!hasAnyFacetEntry && !hasAnyResult) {
    console.warn('Empty payload (no facets AND no results)—treating as bad response')
    return BAD_RESPONSE
  }

  const facets = normalizeFacets(fields) as FacetData
  return {
    facets,
    results,
    count,
    next: rawObj.objects?.next ?? null,
    previous: rawObj.objects?.previous ?? null,
    limit,
    offset,
    ok: true,
    ordering: rawObj.objects?.ordering ?? (raw as { ordering?: SafeSearchResponse['ordering'] }).ordering,
  }
}