import { normalizeFacets } from './normalise-facets'
import { RESULT_TYPE_API_MAP } from '@/lib/api-path-map'

export async function fetchFacetsAndResults(resultType: string, url?: string) {
  const apiSegment = RESULT_TYPE_API_MAP[resultType]
  if (!apiSegment) {
    console.warn(`No API segment mapped for resultType: "${resultType}"`)
    return { facets: {}, results: [] }
  }

  const endpoint = url || `${process.env.NEXT_PUBLIC_API_URL}/api/v1/search/${apiSegment}/facets`

  const res = await fetch(endpoint)
  if (!res.ok) {
    const text = await res.text()
    console.error('Non-OK response:', res.status, text)
    return { facets: {}, results: [] }
  }

  const data = await res.json()
  const facets = normalizeFacets(data.fields || {})
  const results = data.objects?.results ?? []
  const count = data.objects?.count || 0

  return { facets, results, count }
}
