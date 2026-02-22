import { normalizeFacets } from './normalise-facets';
import { RESULT_TYPE_API_MAP } from '@/lib/api-path-map';
import { API_BASE_URL } from '@/lib/api-fetch';
import type { FacetData } from '@/types/facets';

export type SafeSearchResponse = {
  facets: FacetData;
  results: unknown[];
  count: number;
  next: string | null;
  previous: string | null;
  limit: number;
  offset: number;
  ok: boolean;
  ordering?: { current: string; options: Array<{ name: string; text: string; url: string }> };
};

const BAD_RESPONSE: SafeSearchResponse = {
  facets: {},
  results: [],
  count: 0,
  next: null,
  previous: null,
  limit: 0,
  offset: 0,
  ok: false,
};

/** Convert Meilisearch facetDistribution + facetStats into "fields" shape for normalizeFacets. */
function meilisearchFacetsToFields(
  facetDistribution: Record<string, Record<string, number>> = {},
  facetStats: Record<string, Record<string, number>> = {}
): Record<string, unknown> {
  const fields: Record<string, unknown> = {};
  for (const [key, dist] of Object.entries(facetDistribution)) {
    fields[key] = Object.entries(dist).map(([text, count]) => ({ text, count }));
  }
  if (facetStats.date_min && typeof facetStats.date_min.min === 'number') {
    fields.date_min = [
      { text: facetStats.date_min.min },
      { text: facetStats.date_min.max ?? facetStats.date_min.min },
    ];
  }
  if (facetStats.date_max && typeof facetStats.date_max.min === 'number') {
    fields.date_max = [
      { text: facetStats.date_max.min },
      { text: facetStats.date_max.max ?? facetStats.date_max.min },
    ];
  }
  return fields;
}

export async function fetchFacetsAndResults(
  resultType: string,
  url?: string,
  signal?: AbortSignal
): Promise<SafeSearchResponse> {
  const apiSegment = RESULT_TYPE_API_MAP[resultType];
  if (!apiSegment) {
    console.warn(`No API segment mapped for resultType "${resultType}"`);
    return BAD_RESPONSE;
  }

  const endpoint = url || `${API_BASE_URL}/api/v1/search/${apiSegment}/facets`;

  const parsed = new URL(endpoint);
  const limit = parseInt(parsed.searchParams.get('limit') || '20', 10);
  const offset = parseInt(parsed.searchParams.get('offset') || '0', 10);

  let raw: unknown;
  try {
    const res = await fetch(endpoint, { cache: 'no-store', signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    raw = await res.json();
  } catch (e) {
    if ((e as DOMException)?.name === 'AbortError') return BAD_RESPONSE;
    console.error('Fetch or JSON error:', e);
    return BAD_RESPONSE;
  }

  type ApiResponse = {
    facetDistribution?: Record<string, Record<string, number>>;
    facetStats?: Record<string, Record<string, number>>;
    results?: unknown[];
    total?: number;
    next?: string | null;
    previous?: string | null;
    ordering?: SafeSearchResponse['ordering'];
  };
  const data = raw as ApiResponse;

  const results: unknown[] = Array.isArray(data.results) ? data.results : [];
  const count = data.total ?? results.length;
  const hasAnyResult = count > 0;

  const fields = meilisearchFacetsToFields(data.facetDistribution ?? {}, data.facetStats ?? {});
  const facetArrays = Object.values(fields).filter(Array.isArray);
  const hasAnyFacetEntry = facetArrays.some((arr) => (arr as unknown[]).length > 0);

  if (!hasAnyFacetEntry && !hasAnyResult) {
    console.warn('Empty payload (no facets AND no results)—treating as bad response');
    return BAD_RESPONSE;
  }

  const facets = normalizeFacets(fields) as FacetData;
  return {
    facets,
    results,
    count,
    next: data.next ?? null,
    previous: data.previous ?? null,
    limit,
    offset,
    ok: true,
    ordering: data.ordering,
  };
}
