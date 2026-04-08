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
  /** Values can repeat in the URL (e.g. multiple `field__not`). */
  extraParams?: Record<string, string | string[]>;
};

export type ActiveFacetTag = {
  id: string;
  facetKey: string;
  value: string;
  label: string;
  /** When true, render as an exclusion (e.g. NOT repository X). */
  exclude?: boolean;
};

export const DEFAULT_QUERY: QueryState = {
  limit: 20,
  offset: 0,
  ordering: null,
  selected_facets: [],
  dateParams: {},
  extraParams: {},
};

const DATE_PARAM_KEYS = ['min_date', 'max_date', 'at_most_or_least', 'date_diff'] as const;
const FACET_EXACT_SUFFIX = '_exact';
const MULTI_SELECT_FACETS = new Set(['component_features']);

/** URL keys handled outside extraParams / not stored in QueryState.extraParams */
const RESERVED_URL_KEYS = new Set([
  'selected_facets',
  'limit',
  'offset',
  'ordering',
  'advanced',
  'keyword',
  'q',
  'qb',
  'view',
  'compare',
  'format',
  'scope',
  ...DATE_PARAM_KEYS,
]);

type SearchParamReader = {
  get(key: string): string | null;
  getAll(key: string): string[];
};

function readDateParams(reader: SearchParamReader): Record<string, string> {
  return DATE_PARAM_KEYS.reduce<Record<string, string>>((acc, key) => {
    const value = reader.get(key)?.trim();
    if (value) acc[key] = value;
    return acc;
  }, {});
}

function writeDateParams(params: URLSearchParams, dateParams: Record<string, string>): void {
  for (const key of DATE_PARAM_KEYS) {
    const value = dateParams[key];
    if (value) params.set(key, value);
  }
}

function writeExtraParams(
  params: URLSearchParams,
  extraParams: Record<string, string | string[]> | undefined
): void {
  if (!extraParams) return;
  for (const [key, value] of Object.entries(extraParams)) {
    const normalizedKey = key.trim();
    if (!normalizedKey) continue;
    if (Array.isArray(value)) {
      for (const v of value) {
        const t = v.trim();
        if (t) params.append(normalizedKey, t);
      }
    } else {
      const t = value.trim();
      if (t) params.set(normalizedKey, t);
    }
  }
}

function parseNumericParam(value: string | null, fallback: number): number {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function facetEntry(facetKey: string, value: string): string {
  return `${facetKey}${FACET_EXACT_SUFFIX}:${value}`;
}

export function normalizeKeyword(keyword: string | null | undefined): string {
  return (keyword ?? '').trim().replace(/\s+/g, ' ');
}

function normalizeExtraParams(
  extra: Record<string, string | string[]> | undefined
): Record<string, string | string[]> {
  if (!extra) return {};
  const out: Record<string, string | string[]> = {};
  for (const [key, value] of Object.entries(extra)) {
    const k = key.trim();
    if (!k) continue;
    if (Array.isArray(value)) {
      const arr = [...new Set(value.map((v) => v.trim()).filter(Boolean))].sort();
      if (arr.length) out[k] = arr.length === 1 ? arr[0]! : arr;
    } else {
      const t = value.trim();
      if (t) out[k] = t;
    }
  }
  return Object.fromEntries(Object.entries(out).sort(([a], [b]) => a.localeCompare(b)));
}

export function normalizeQueryState(q: QueryState): QueryState {
  return {
    ...q,
    selected_facets: [...new Set(q.selected_facets.map((v) => v.trim()).filter(Boolean))].sort(),
    ordering: q.ordering?.trim() || null,
    dateParams: readDateParams({
      get: (key) => q.dateParams[key] ?? null,
      getAll: () => [],
    }),
    extraParams: normalizeExtraParams(q.extraParams),
  };
}

export function buildQueryString(q: QueryState): string {
  const normalized = normalizeQueryState(q);
  const p = new URLSearchParams();
  for (const v of normalized.selected_facets) p.append('selected_facets', v);
  p.set('limit', String(normalized.limit));
  p.set('offset', String(normalized.offset));
  if (normalized.ordering) p.set('ordering', normalized.ordering);
  writeDateParams(p, normalized.dateParams);
  writeExtraParams(p, normalized.extraParams);
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
  return readDateParams(u.searchParams);
}

export function stateFromUrl(url: string, base: string): QueryState {
  const u = new URL(url, base);
  return stateFromSearchParams(u.searchParams);
}

export function stateFromSearchParams(sp: SearchParamReader): QueryState {
  return {
    selected_facets: sp.getAll('selected_facets'),
    limit: parseNumericParam(sp.get('limit'), 20),
    offset: parseNumericParam(sp.get('offset'), 0),
    ordering: sp.get('ordering')?.trim() || null,
    dateParams: readDateParams(sp),
    extraParams: readExtraParams(sp),
  };
}

function readExtraParams(sp: SearchParamReader): Record<string, string | string[]> {
  const extra: Record<string, string | string[]> = {};
  const maybeEntries = (
    sp as SearchParamReader & { entries?: () => IterableIterator<[string, string]> }
  ).entries;
  if (typeof maybeEntries !== 'function') return extra;

  const keyToValues = new Map<string, string[]>();
  for (const [key, value] of maybeEntries.call(sp)) {
    if (RESERVED_URL_KEYS.has(key)) continue;
    const normalized = value.trim();
    if (!normalized) continue;
    const list = keyToValues.get(key) ?? [];
    list.push(normalized);
    keyToValues.set(key, list);
  }
  for (const [key, values] of keyToValues) {
    const uniq = [...new Set(values)].sort();
    extra[key] = uniq.length === 1 ? uniq[0]! : uniq;
  }
  return extra;
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
      const toRemove = facetEntry(action.facetKey, action.value);
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
      const entry = facetEntry(action.facetKey, action.value);
      const without = MULTI_SELECT_FACETS.has(action.facetKey)
        ? queryState.selected_facets
        : queryState.selected_facets.filter(
            (s) => !s.startsWith(`${action.facetKey}${FACET_EXACT_SUFFIX}:`)
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
    case 'excludeFacet': {
      const k = `${action.facetKey}__not`;
      const prev = queryState.extraParams ?? {};
      const nextExtra = { ...prev };
      const existing = nextExtra[k];
      const val = action.value.trim();
      if (!val) {
        return { type: 'query', value: { ...queryState, offset: 0 } };
      }
      if (existing === undefined) {
        nextExtra[k] = val;
      } else if (Array.isArray(existing)) {
        nextExtra[k] = [...new Set([...existing.map((x) => x.trim()), val])].sort();
      } else {
        const e = existing.trim();
        nextExtra[k] = e === val ? e : [e, val].sort();
      }
      return {
        type: 'query',
        value: {
          ...queryState,
          extraParams: nextExtra,
          offset: 0,
        },
      };
    }
  }
}

export function getSelectedForFacet(selectedFacets: string[], facetKey: string): string | null {
  const prefix = `${facetKey}${FACET_EXACT_SUFFIX}:`;
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

function buildExclusionTagsFromExtraParams(
  extraParams: Record<string, string | string[]> | undefined,
  searchType?: string
): ActiveFacetTag[] {
  if (!extraParams) return [];
  const tags: ActiveFacetTag[] = [];
  for (const [key, value] of Object.entries(extraParams)) {
    if (!key.endsWith('__not')) continue;
    const facetKey = key.slice(0, -5);
    const values = Array.isArray(value) ? value : [value];
    for (const v of values) {
      const t = v.trim();
      if (!t) continue;
      tags.push({
        id: `__not__:${facetKey}:${t}`,
        facetKey,
        value: t,
        label: `NOT ${formatFacetTitle(facetKey, searchType)}: ${t}`,
        exclude: true,
      });
    }
  }
  return tags;
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
  extraParams,
}: {
  submittedKeyword: string;
  dateParams: Record<string, string>;
  selectedFacets: string[];
  searchType?: string;
  extraParams?: Record<string, string | string[]>;
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
  tags.push(...buildExclusionTagsFromExtraParams(extraParams, searchType));
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
    place_type: 'Place Type',
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
    extraParams: {},
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

export function removeExclusionFromExtraParams(
  queryState: QueryState,
  facetKey: string,
  value: string
): QueryState {
  const k = `${facetKey}__not`;
  const prev = queryState.extraParams ?? {};
  const raw = prev[k];
  if (raw === undefined) return queryState;
  const nextExtra = { ...prev };
  if (Array.isArray(raw)) {
    const filtered = raw.filter((x) => x.trim() !== value);
    if (filtered.length === 0) delete nextExtra[k];
    else nextExtra[k] = filtered.length === 1 ? filtered[0]! : filtered;
  } else if (raw.trim() === value) {
    delete nextExtra[k];
  }
  return { ...queryState, extraParams: nextExtra, offset: 0 };
}

// --- Query builder (advanced search) ---

export type ConditionOperator =
  | 'is'
  | 'is_not'
  | 'contains'
  | 'starts_with'
  | 'gt'
  | 'lt'
  | 'between'
  | 'is_empty'
  | 'is_not_empty';

export type QueryCondition = {
  id: string;
  t: 'cond';
  field: string;
  op: ConditionOperator;
  value: string;
  valueTo?: string;
};

export type QueryGroup = {
  id: string;
  t: 'group';
  op: 'AND' | 'OR';
  items: QueryBuilderNode[];
};

type QueryBuilderNode = QueryCondition | QueryGroup;

function newId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `id_${Math.random().toString(36).slice(2)}`;
}

export function createEmptyQueryGroup(op: 'AND' | 'OR' = 'AND'): QueryGroup {
  return { id: newId(), t: 'group', op, items: [] };
}

function countConditionsInTreeItem(node: QueryBuilderNode): number {
  if (node.t === 'cond') return node.field.trim() ? 1 : 0;
  return node.items.reduce((acc, child) => acc + countConditionsInTreeItem(child), 0);
}

function countConditionsInRoot(root: QueryGroup): number {
  return root.items.reduce((acc, child) => acc + countConditionsInTreeItem(child), 0);
}

/** Base64url-encode JSON for `qb` API param. */
function encodeQueryBuilderRoot(root: QueryGroup): string {
  const json = JSON.stringify(root);
  const utf8 = new TextEncoder().encode(json);
  let bin = '';
  for (const b of utf8) {
    bin += String.fromCharCode(b);
  }
  const b64 =
    typeof btoa !== 'undefined' ? btoa(bin) : Buffer.from(json, 'utf-8').toString('base64');
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function decodeQueryBuilderRoot(raw: string): QueryGroup | null {
  try {
    let b64 = raw.trim().replace(/-/g, '+').replace(/_/g, '/');
    const pad = -b64.length % 4;
    if (pad) b64 += '='.repeat(pad);
    let json: string;
    if (typeof atob !== 'undefined') {
      const bin = atob(b64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      json = new TextDecoder().decode(bytes);
    } else {
      json = Buffer.from(b64, 'base64').toString('utf-8');
    }
    const data = JSON.parse(json) as unknown;
    return migrateQueryBuilderRoot(data);
  } catch {
    return null;
  }
}

function migrateQueryBuilderRoot(data: unknown): QueryGroup | null {
  if (!data || typeof data !== 'object') return null;
  const o = data as Record<string, unknown>;
  if (o.t !== 'group') return null;
  const op = o.op === 'OR' ? 'OR' : 'AND';
  const itemsRaw = o.items;
  if (!Array.isArray(itemsRaw)) return null;
  const items: QueryBuilderNode[] = [];
  for (const item of itemsRaw) {
    if (!item || typeof item !== 'object') continue;
    const it = item as Record<string, unknown>;
    if (it.t === 'group') {
      const nested = migrateQueryBuilderRoot(item);
      if (nested) items.push(nested);
    } else if (it.t === 'cond') {
      items.push({
        id: typeof it.id === 'string' ? it.id : newId(),
        t: 'cond',
        field: String(it.field ?? ''),
        op: (it.op as ConditionOperator) || 'is',
        value: String(it.value ?? ''),
        valueTo: it.valueTo != null ? String(it.valueTo) : undefined,
      });
    }
  }
  return {
    id: typeof o.id === 'string' ? o.id : newId(),
    t: 'group',
    op,
    items,
  };
}

/** Build extraParams from advanced panel (matching, search_field, qb). Excludes legacy flat keys we manage via qb. */
export function buildAdvancedExtraParams(params: {
  enabled: boolean;
  matchingStrategy: 'all' | 'last';
  searchField: string;
  queryRoot: QueryGroup;
}): Record<string, string | string[]> {
  if (!params.enabled) return {};
  const out: Record<string, string | string[]> = {
    matching_strategy: params.matchingStrategy,
  };
  if (params.searchField.trim()) {
    out.search_field = params.searchField.trim();
  }
  const n = countConditionsInRoot(params.queryRoot);
  if (n > 0) {
    out.qb = encodeQueryBuilderRoot(params.queryRoot);
  }
  return out;
}

/** Strip advanced-controlled keys from extraParams; used before merging fresh advanced params. */
const ADVANCED_EXTRA_KEYS = new Set(['matching_strategy', 'search_field', 'qb']);

export function stripAdvancedExtraParams(
  extra: Record<string, string | string[]> | undefined
): Record<string, string | string[]> {
  if (!extra) return {};
  const next: Record<string, string | string[]> = {};
  for (const [k, v] of Object.entries(extra)) {
    if (ADVANCED_EXTRA_KEYS.has(k)) continue;
    next[k] = v;
  }
  return next;
}

export function mergeAdvancedIntoExtraParams(
  base: Record<string, string | string[]> | undefined,
  advanced: ReturnType<typeof buildAdvancedExtraParams>
): Record<string, string | string[]> {
  const cleaned = stripAdvancedExtraParams(base);
  return normalizeExtraParams({ ...cleaned, ...advanced });
}

export function areExtraParamsEqual(
  a: Record<string, string | string[]> | undefined,
  b: Record<string, string | string[]> | undefined
): boolean {
  const na = normalizeExtraParams(a);
  const nb = normalizeExtraParams(b);
  const keysA = Object.keys(na);
  const keysB = Object.keys(nb);
  if (keysA.length !== keysB.length) return false;
  for (const k of keysA) {
    const va = na[k];
    const vb = nb[k];
    if (Array.isArray(va) && Array.isArray(vb)) {
      if (va.length !== vb.length) return false;
      if (!va.every((x, i) => x === vb[i])) return false;
    } else if (va !== vb) return false;
  }
  return true;
}

/** Load query builder tree from `qb` or legacy flat __not / __min / __max params. */
export function parseQueryRootFromUrl(sp: URLSearchParams): QueryGroup {
  const qb = sp.get('qb');
  if (qb) {
    const decoded = decodeQueryBuilderRoot(qb);
    if (decoded) return decoded;
  }
  return rebuildQueryRootFromFlatSearchParams(sp);
}

function rebuildQueryRootFromFlatSearchParams(sp: URLSearchParams): QueryGroup {
  const items: QueryBuilderNode[] = [];
  for (const key of new Set([...sp.keys()])) {
    if (RESERVED_URL_KEYS.has(key)) continue;
    if (key.endsWith('__not')) {
      const field = key.slice(0, -5);
      for (const value of sp.getAll(key)) {
        const t = value.trim();
        if (!t) continue;
        items.push({
          id: newId(),
          t: 'cond',
          field,
          op: 'is_not',
          value: t,
        });
      }
    }
  }
  const minKeys = [...new Set([...sp.keys()])].filter((k) => k.endsWith('__min'));
  for (const minKey of minKeys) {
    const field = minKey.replace(/__min$/, '');
    const lo = sp.get(minKey) ?? '';
    const hi = sp.get(`${field}__max`) ?? '';
    if (lo && hi) {
      items.push({
        id: newId(),
        t: 'cond',
        field,
        op: 'between',
        value: lo,
        valueTo: hi,
      });
    } else if (lo) {
      items.push({ id: newId(), t: 'cond', field, op: 'gt', value: lo });
    } else if (hi) {
      items.push({ id: newId(), t: 'cond', field, op: 'lt', value: hi });
    }
  }
  return { id: newId(), t: 'group', op: 'AND', items };
}
