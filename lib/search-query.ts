/**
 * Search query state and URL helpers for the facet search UI.
 */

export type QueryState = {
  limit: number
  offset: number
  ordering: string | null
  selected_facets: string[]
  dateParams: Record<string, string>
}

export const DEFAULT_QUERY: QueryState = {
  limit: 20,
  offset: 0,
  ordering: null,
  selected_facets: [],
  dateParams: {},
}

const DATE_PARAM_KEYS = ['min_date', 'max_date', 'at_most_or_least', 'date_diff'] as const

export function buildQueryString(q: QueryState): string {
  const p = new URLSearchParams()
  for (const v of q.selected_facets) p.append('selected_facets', v)
  p.set('limit', String(q.limit))
  p.set('offset', String(q.offset))
  if (q.ordering) p.set('ordering', q.ordering)
  for (const k of DATE_PARAM_KEYS) {
    const v = q.dateParams[k]
    if (v) p.set(k, v)
  }
  return p.toString()
}

export function buildApiUrl(base: string, q: QueryState): string {
  const qs = buildQueryString(q)
  return qs ? `${base}?${qs}` : base
}

export function parseDateParamsFromUrl(url: string, base: string): Record<string, string> {
  const u = new URL(url, base)
  const out: Record<string, string> = {}
  for (const k of DATE_PARAM_KEYS) {
    const v = u.searchParams.get(k)
    if (v) out[k] = v
  }
  return out
}

export function stateFromUrl(url: string, base: string): QueryState {
  const u = new URL(url, base)
  return stateFromSearchParams(u.searchParams)
}

export function stateFromSearchParams(
  sp: { get(key: string): string | null; getAll(key: string): string[] }
): QueryState {
  const out: Record<string, string> = {}
  for (const k of DATE_PARAM_KEYS) {
    const v = sp.get(k)
    if (v) out[k] = v
  }
  return {
    selected_facets: sp.getAll('selected_facets'),
    limit: parseInt(sp.get('limit') || '20', 10),
    offset: parseInt(sp.get('offset') || '0', 10),
    ordering: sp.get('ordering') || null,
    dateParams: out,
  }
}

export function getSelectedForFacet(selectedFacets: string[], facetKey: string): string | null {
  const prefix = `${facetKey}_exact:`
  const found = selectedFacets.find((s) => s.startsWith(prefix))
  return found ? found.slice(prefix.length) : null
}

export function formatTypeLabel(type: string): string {
  return type.charAt(0).toUpperCase() + type.slice(1)
}

export function formatFacetTitle(facetKey: string): string {
  return facetKey.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export function filterResultsByKeyword(results: unknown[], keyword: string): unknown[] {
  if (!keyword.trim()) return results
  if (!Array.isArray(results)) return []
  const low = keyword.toLowerCase()
  return results.filter((row) => {
    if (row == null || typeof row !== 'object') return false
    return Object.values(row as Record<string, unknown>).some((v) =>
      typeof v === 'string' || typeof v === 'number' ? String(v).toLowerCase().includes(low) : false
    )
  })
}

export function getSuggestionsPool(results: unknown[]): string[] {
  if (!Array.isArray(results)) return []
  return Array.from(
    new Set(
      results.flatMap((r) => {
        if (r == null || typeof r !== 'object') return []
        return Object.values(r as Record<string, unknown>)
          .filter((v): v is string | number => typeof v === 'string' || typeof v === 'number')
          .map(String)
      })
    )
  )
}
