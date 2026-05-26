import type { BackendGraph } from '@/services/annotations';

// Pure filter/sort/URL logic for the per-image annotation gallery. Kept out of
// the (large) gallery component so it can be unit-tested in isolation.

export type DescriptionStatus = 'all' | 'described' | 'undescribed';

export type SortKey = 'allograph-asc' | 'allograph-desc' | 'count-desc' | 'count-asc';
export const DEFAULT_SORT: SortKey = 'allograph-asc';
export const SORT_KEYS: SortKey[] = ['allograph-asc', 'allograph-desc', 'count-desc', 'count-asc'];
export const SORT_LABELS: Record<SortKey, string> = {
  'allograph-asc': 'Allograph A–Z',
  'allograph-desc': 'Allograph Z–A',
  'count-desc': 'Most graphs',
  'count-asc': 'Fewest graphs',
};

export interface GalleryFilterState {
  /** Allograph-name substring (case-insensitive). */
  allograph: string;
  /** Selected hand keys (null = the "Unattributed" bucket). Empty = all. */
  hands: (number | null)[];
  status: DescriptionStatus;
  /** Feature ids a graph must all have. */
  features: number[];
  /** Position ids a graph must all have. */
  positions: number[];
  sort: SortKey;
}

export const EMPTY_FILTERS: GalleryFilterState = {
  allograph: '',
  hands: [],
  status: 'all',
  features: [],
  positions: [],
  sort: DEFAULT_SORT,
};

export interface NamedOption {
  id: number;
  name: string;
}

const HAND_UNATTRIBUTED = 'unattributed';

export function isGraphDescribed(graph: BackendGraph): boolean {
  if (typeof graph.is_described === 'boolean') return graph.is_described;
  const hasFeature = (graph.graphcomponent_set ?? []).some((c) => c.features.length > 0);
  const hasPosition = (graph.positions ?? []).length > 0;
  return hasFeature || hasPosition;
}

function graphHandKey(graph: BackendGraph): number | null {
  return typeof graph.hand === 'number' ? graph.hand : null;
}

export function graphHasFeature(graph: BackendGraph, featureId: number): boolean {
  return (graph.graphcomponent_set ?? []).some((c) => c.features.includes(featureId));
}

export function graphMatchesFilters(graph: BackendGraph, f: GalleryFilterState): boolean {
  if (f.hands.length > 0 && !f.hands.includes(graphHandKey(graph))) return false;
  if (f.status === 'described' && !isGraphDescribed(graph)) return false;
  if (f.status === 'undescribed' && isGraphDescribed(graph)) return false;
  if (f.features.length > 0 && !f.features.every((id) => graphHasFeature(graph, id))) return false;
  if (f.positions.length > 0) {
    const pos = new Set(graph.positions ?? []);
    if (!f.positions.every((id) => pos.has(id))) return false;
  }
  return true;
}

export function applyGraphFilters(graphs: BackendGraph[], f: GalleryFilterState): BackendGraph[] {
  return graphs.filter((g) => graphMatchesFilters(g, f));
}

// Distinct features/positions actually present on the supplied graphs, so the
// filter dropdowns only offer options that can match something. Names come
// from the graph payload's *_details so no allograph schema is needed.
export function collectFeatures(graphs: BackendGraph[]): NamedOption[] {
  const byId = new Map<number, string>();
  for (const g of graphs) {
    for (const c of g.graphcomponent_set ?? []) {
      for (const fd of c.feature_details ?? []) byId.set(fd.id, fd.name);
    }
  }
  return [...byId].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
}

export function collectPositions(graphs: BackendGraph[]): NamedOption[] {
  const byId = new Map<number, string>();
  for (const g of graphs) {
    for (const pd of g.position_details ?? []) byId.set(pd.id, pd.name);
  }
  return [...byId].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
}

export function activeFilterCount(f: GalleryFilterState): number {
  return (
    (f.allograph.trim() ? 1 : 0) +
    f.hands.length +
    (f.status !== 'all' ? 1 : 0) +
    f.features.length +
    f.positions.length
  );
}

export function hasActiveFilters(f: GalleryFilterState): boolean {
  return activeFilterCount(f) > 0;
}

// Comparator over { allographName, graphCount } so the gallery can reorder
// allograph groups within each hand without this module importing its types.
export function allographGroupComparator(sort: SortKey) {
  return (
    a: { allographName: string; count: number },
    b: { allographName: string; count: number }
  ) => {
    switch (sort) {
      case 'allograph-desc':
        return b.allographName.localeCompare(a.allographName);
      case 'count-desc':
        return b.count - a.count || a.allographName.localeCompare(b.allographName);
      case 'count-asc':
        return a.count - b.count || a.allographName.localeCompare(b.allographName);
      case 'allograph-asc':
      default:
        return a.allographName.localeCompare(b.allographName);
    }
  };
}

// ---------------------------------------------------------------------------
// URL (de)serialization — short param names, defaults omitted, so a clean view
// produces a clean URL.
// ---------------------------------------------------------------------------

const csvNumbers = (ids: number[]) => ids.join(',');
const parseCsvNumbers = (raw: string | null): number[] =>
  (raw ?? '')
    .split(',')
    .filter(Boolean)
    .map((s) => Number(s))
    .filter((n) => Number.isFinite(n));

export function filtersToQuery(f: GalleryFilterState): Record<string, string> {
  const q: Record<string, string> = {};
  if (f.allograph.trim()) q.a = f.allograph.trim();
  if (f.hands.length > 0)
    q.h = f.hands.map((h) => (h === null ? HAND_UNATTRIBUTED : String(h))).join(',');
  if (f.status !== 'all') q.s = f.status;
  if (f.features.length > 0) q.f = csvNumbers(f.features);
  if (f.positions.length > 0) q.p = csvNumbers(f.positions);
  if (f.sort !== DEFAULT_SORT) q.sort = f.sort;
  return q;
}

export function filtersFromParams(params: URLSearchParams): GalleryFilterState {
  const statusRaw = params.get('s');
  const status: DescriptionStatus =
    statusRaw === 'described' || statusRaw === 'undescribed' ? statusRaw : 'all';

  const sortRaw = params.get('sort') as SortKey | null;
  const sort: SortKey = sortRaw && SORT_KEYS.includes(sortRaw) ? sortRaw : DEFAULT_SORT;

  const hands = (params.get('h') ?? '')
    .split(',')
    .filter(Boolean)
    .map((h) => (h === HAND_UNATTRIBUTED ? null : Number(h)))
    .filter((h) => h === null || Number.isFinite(h));

  return {
    allograph: params.get('a') ?? '',
    hands,
    status,
    features: parseCsvNumbers(params.get('f')),
    positions: parseCsvNumbers(params.get('p')),
    sort,
  };
}
