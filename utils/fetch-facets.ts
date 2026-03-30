import { API_BASE_URL } from '@/lib/api-fetch';
import { SEARCH_RESULT_CONFIG, type ResultType } from '@/lib/search-types';
import {
  buildApiUrl,
  normalizeKeyword,
  normalizeQueryState,
  type QueryState,
} from '@/lib/search-query';
import type { FacetData, FacetListItem } from '@/types/facets';

export type SearchResult = {
  facets: FacetData;
  results: unknown[];
  count: number;
  next: string | null;
  previous: string | null;
  limit: number;
  offset: number;
  ordering?: { current: string; options: Array<{ name: string; text: string; url: string }> };
  facetDistribution?: Record<string, Record<string, number>>;
  facetStats?: Record<string, Record<string, number>>;
};

type FacetBucket = {
  text?: unknown;
  label?: unknown;
  count?: unknown;
  value?: unknown;
  narrow_url?: unknown;
  href?: unknown;
};

function toNumberList(input: unknown): number[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((entry) =>
      typeof entry === 'object' && entry != null ? (entry as { text?: unknown }).text : null
    )
    .filter((value): value is number => typeof value === 'number');
}

function toListItems(input: unknown): FacetListItem[] {
  if (!Array.isArray(input)) return [];
  return input.flatMap((entry): FacetListItem[] => {
    if (entry == null || typeof entry !== 'object') return [];
    const bucket = entry as FacetBucket;
    const rawLabel = bucket.text ?? bucket.label ?? '';
    const label = String(rawLabel).trim();
    if (!label) return [];
    const value = String(bucket.value ?? rawLabel).trim();
    return [
      {
        label,
        count: typeof bucket.count === 'number' ? bucket.count : 0,
        value,
        href: String(bucket.narrow_url ?? bucket.href ?? ''),
      },
    ];
  });
}

function normalizeFacets(fields: Record<string, unknown>): FacetData {
  const facets: FacetData = {};
  const minDates = toNumberList(fields.date_min);
  const maxDates = toNumberList(fields.date_max);

  if (minDates.length > 0 && maxDates.length > 0) {
    const min = minDates.reduce((acc, cur) => Math.min(acc, cur), minDates[0]);
    const max = maxDates.reduce((acc, cur) => Math.max(acc, cur), maxDates[0]);
    facets.text_date = {
      kind: 'range',
      range: [min, max],
      defaultValue: [min, max],
    };
  }

  for (const [key, value] of Object.entries(fields)) {
    if (key === 'date_min' || key === 'date_max' || key === 'text_date') continue;
    const items = toListItems(value);
    if (items.length > 0) {
      facets[key] = { kind: 'list', items };
    }
  }

  return facets;
}

export const EMPTY_SEARCH_RESULT: SearchResult = {
  facets: {},
  results: [],
  count: 0,
  next: null,
  previous: null,
  limit: 0,
  offset: 0,
};

export const searchKeys = {
  all: ['search'] as const,
  resultType: (resultType: ResultType) => [...searchKeys.all, resultType] as const,
  facets: (resultType: ResultType, url: string) =>
    [...searchKeys.resultType(resultType), 'facets', url] as const,
  globalSuggestions: () => [...searchKeys.all, 'global-suggestions'] as const,
  suggestions: (path: string) => [...searchKeys.all, 'suggestions', path] as const,
} as const;

export function getSearchBaseFacetUrl(resultType: ResultType): string {
  const apiSegment = SEARCH_RESULT_CONFIG[resultType].apiPath;
  return `${API_BASE_URL}/api/v1/search/${apiSegment}/facets`;
}

export function buildSearchRequestUrl(
  resultType: ResultType,
  queryState: QueryState,
  keyword: string
): string {
  return buildApiUrl(
    getSearchBaseFacetUrl(resultType),
    normalizeQueryState(queryState),
    normalizeKeyword(keyword)
  );
}

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
  resultType: ResultType,
  url?: string,
  signal?: AbortSignal
): Promise<SearchResult | null> {
  const endpoint = url || getSearchBaseFacetUrl(resultType);

  const parsed = new URL(endpoint);
  const limit = parseInt(parsed.searchParams.get('limit') || '20', 10);
  const offset = parseInt(parsed.searchParams.get('offset') || '0', 10);

  let raw: unknown;
  try {
    const res = await fetch(endpoint, { cache: 'no-store', signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    raw = await res.json();
  } catch (e) {
    if ((e as DOMException)?.name === 'AbortError') return null;
    console.error('Fetch or JSON error:', e);
    return null;
  }

  type ApiResponse = {
    facetDistribution?: Record<string, Record<string, number>>;
    facetStats?: Record<string, Record<string, number>>;
    results?: unknown[];
    total?: number;
    next?: string | null;
    previous?: string | null;
    ordering?: SearchResult['ordering'];
  };
  const data = raw as ApiResponse;

  const results: unknown[] = Array.isArray(data.results) ? data.results : [];
  const count = data.total ?? results.length;
  const fields = meilisearchFacetsToFields(data.facetDistribution ?? {}, data.facetStats ?? {});

  const facets: FacetData = normalizeFacets(fields);
  return {
    facets,
    results,
    count,
    next: data.next ?? null,
    previous: data.previous ?? null,
    limit,
    offset,
    ordering: data.ordering,
    facetDistribution: data.facetDistribution ?? {},
    facetStats: data.facetStats ?? {},
  };
}
