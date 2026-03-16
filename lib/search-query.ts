/**
 * Search query state and URL helpers for the facet search UI.
 */
import type { FacetClickAction } from '@/types/facets';

export type QueryState = {
  limit: number;
  offset: number;
  ordering: string | null;
  selected_facets: string[];
  dateParams: Record<string, string>;
};

export type ActiveFacetTag = {
  id: string;
  facetKey: string;
  value: string;
  label: string;
};

export const DEFAULT_QUERY: QueryState = {
  limit: 20,
  offset: 0,
  ordering: null,
  selected_facets: [],
  dateParams: {},
};

const DATE_PARAM_KEYS = ['min_date', 'max_date', 'at_most_or_least', 'date_diff'] as const;

export function normalizeKeyword(keyword: string | null | undefined): string {
  return (keyword ?? '').trim().replace(/\s+/g, ' ');
}

export function normalizeQueryState(q: QueryState): QueryState {
  return {
    ...q,
    selected_facets: [...new Set(q.selected_facets.map((v) => v.trim()).filter(Boolean))].sort(),
    ordering: q.ordering?.trim() || null,
    dateParams: DATE_PARAM_KEYS.reduce<Record<string, string>>((acc, key) => {
      const value = q.dateParams[key]?.trim();
      if (value) acc[key] = value;
      return acc;
    }, {}),
  };
}

export function buildQueryString(q: QueryState): string {
  const normalized = normalizeQueryState(q);
  const p = new URLSearchParams();
  for (const v of normalized.selected_facets) p.append('selected_facets', v);
  p.set('limit', String(normalized.limit));
  p.set('offset', String(normalized.offset));
  if (normalized.ordering) p.set('ordering', normalized.ordering);
  for (const k of DATE_PARAM_KEYS) {
    const v = normalized.dateParams[k];
    if (v) p.set(k, v);
  }
  return p.toString();
}

export function buildApiUrl(base: string, q: QueryState, keyword?: string): string {
  const p = new URLSearchParams(buildQueryString(q));
  const normalizedKeyword = normalizeKeyword(keyword);
  if (normalizedKeyword) {
    p.set('q', normalizedKeyword);
  }
  const qs = p.toString();
  return qs ? `${base}?${qs}` : base;
}

export function parseDateParamsFromUrl(url: string, base: string): Record<string, string> {
  const u = new URL(url, base);
  const out: Record<string, string> = {};
  for (const k of DATE_PARAM_KEYS) {
    const v = u.searchParams.get(k);
    if (v) out[k] = v;
  }
  return out;
}

export function stateFromUrl(url: string, base: string): QueryState {
  const u = new URL(url, base);
  return stateFromSearchParams(u.searchParams);
}

export function stateFromSearchParams(sp: {
  get(key: string): string | null;
  getAll(key: string): string[];
}): QueryState {
  const out: Record<string, string> = {};
  for (const k of DATE_PARAM_KEYS) {
    const v = sp.get(k);
    if (v) out[k] = v;
  }
  return {
    selected_facets: sp.getAll('selected_facets'),
    limit: parseInt(sp.get('limit') || '20', 10),
    offset: parseInt(sp.get('offset') || '0', 10),
    ordering: sp.get('ordering') || null,
    dateParams: out,
  };
}

export type FacetClickResolution =
  | { type: 'keyword'; value: string }
  | { type: 'query'; value: QueryState }
  | { type: 'noop' };

export function resolveFacetClick({
  arg,
  action,
  queryState,
  baseFacetURL,
}: {
  arg: string;
  action?: FacetClickAction;
  queryState: QueryState;
  baseFacetURL: string;
}): FacetClickResolution {
  if (!action) {
    return !arg.startsWith('http') && !arg.startsWith('/')
      ? { type: 'keyword', value: arg }
      : { type: 'noop' };
  }

  switch (action.type) {
    case 'mergeDateParams':
      return {
        type: 'query',
        value: {
          ...queryState,
          dateParams: parseDateParamsFromUrl(arg, baseFacetURL),
          offset: 0,
        },
      };
    case 'deselectFacet': {
      const toRemove = `${action.facetKey}_exact:${action.value}`;
      return {
        type: 'query',
        value: {
          ...queryState,
          selected_facets: queryState.selected_facets.filter((s) => s !== toRemove),
          offset: 0,
        },
      };
    }
    case 'selectFacet': {
      const entry = `${action.facetKey}_exact:${action.value}`;
      const without = queryState.selected_facets.filter(
        (s) => !s.startsWith(`${action.facetKey}_exact:`)
      );
      return {
        type: 'query',
        value: {
          ...queryState,
          selected_facets: without.includes(entry) ? without : [...without, entry],
          offset: 0,
        },
      };
    }
  }
}

export function getSelectedForFacet(selectedFacets: string[], facetKey: string): string | null {
  const prefix = `${facetKey}_exact:`;
  const found = selectedFacets.find((s) => s.startsWith(prefix));
  return found ? found.slice(prefix.length) : null;
}

export function buildActiveFacetTags(
  selectedFacets: string[],
  searchType?: string
): ActiveFacetTag[] {
  return selectedFacets
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [rawKey, ...rest] = entry.split(':');
      if (!rawKey || rest.length === 0) return null;
      const facetKey = rawKey.replace(/_exact$/, '');
      const value = rest.join(':').trim();
      if (!facetKey || !value) return null;
      return {
        id: `${facetKey}:${value}`,
        facetKey,
        value,
        label: `${formatFacetTitle(facetKey, searchType)}: ${value}`,
      } satisfies ActiveFacetTag;
    })
    .filter((item): item is ActiveFacetTag => item != null);
}

export function buildDateFilterTag(dateParams: Record<string, string>): ActiveFacetTag | null {
  const min = dateParams.min_date?.trim();
  const max = dateParams.max_date?.trim();
  const precision = dateParams.at_most_or_least?.trim();
  const diff = dateParams.date_diff?.trim();
  if (!min && !max && !precision && !diff) return null;

  const range = [min, max].filter(Boolean).join(' - ');
  const precisionPart = precision && diff ? `${precision} ${diff}` : '';
  const labelSuffix = [range, precisionPart].filter(Boolean).join(', ');

  return {
    id: '__date__',
    facetKey: '__date__',
    value: labelSuffix,
    label: `Date: ${labelSuffix || 'Custom range'}`,
  };
}

export function buildActiveQueryTags({
  submittedKeyword,
  dateParams,
  selectedFacets,
  searchType,
}: {
  submittedKeyword: string;
  dateParams: Record<string, string>;
  selectedFacets: string[];
  searchType?: string;
}): ActiveFacetTag[] {
  const tags: ActiveFacetTag[] = [];
  const keywordValue = normalizeKeyword(submittedKeyword);
  if (keywordValue) {
    tags.push({
      id: '__keyword__',
      facetKey: '__keyword__',
      value: keywordValue,
      label: `Keyword: ${keywordValue}`,
    });
  }
  const dateTag = buildDateFilterTag(dateParams);
  if (dateTag) tags.push(dateTag);
  return [...tags, ...buildActiveFacetTags(selectedFacets, searchType)];
}

/**
 * Human-readable label overrides for facet keys, keyed by searchType then facetKey.
 * Falls back to a global map, then to auto-formatted title.
 */
const FACET_LABEL_OVERRIDES: Record<string, Record<string, string>> = {
  _global: {
    type: 'Document Type',
    repository_name: 'Repository',
  },
  people: {
    person_type: 'Category',
  },
  places: {
    place_type: 'Clause Type',
  },
};

export function formatFacetTitle(facetKey: string, searchType?: string): string {
  if (searchType) {
    const typeOverrides = FACET_LABEL_OVERRIDES[searchType];
    if (typeOverrides?.[facetKey]) return typeOverrides[facetKey];
  }
  const globalOverrides = FACET_LABEL_OVERRIDES._global;
  if (globalOverrides?.[facetKey]) return globalOverrides[facetKey];
  return facetKey.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function getSuggestionsPool(results: unknown[]): string[] {
  if (!Array.isArray(results)) return [];
  return Array.from(
    new Set(
      results.flatMap((r) => {
        if (r == null || typeof r !== 'object') return [];
        return Object.values(r as Record<string, unknown>)
          .filter((v): v is string | number => typeof v === 'string' || typeof v === 'number')
          .map(String);
      })
    )
  );
}

export function withOffset(queryState: QueryState, offset: number): QueryState {
  return { ...queryState, offset: Math.max(0, offset) };
}

export function withLimit(queryState: QueryState, limit: number): QueryState {
  return { ...queryState, limit, offset: 0 };
}

export function clearAllFacetFilters(queryState: QueryState): QueryState {
  return {
    ...queryState,
    selected_facets: [],
    dateParams: {},
    offset: 0,
  };
}

export function clearDateFilters(queryState: QueryState): QueryState {
  return {
    ...queryState,
    dateParams: {},
    offset: 0,
  };
}
