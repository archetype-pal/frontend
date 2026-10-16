import type { BackendGraph } from '@/services/annotations';
import type { AllographSummary } from '@/types/allographs';
import type { HandType } from '@/types/hands';
import { formatAllographLabel } from '@/lib/allograph-labels';
import {
  type GalleryFilterState,
  type SortKey,
  DEFAULT_SORT,
  allographGroupComparator,
  applyGraphFilters,
} from '@/lib/annotation-gallery-filters';
import { sortHandsByPriority } from '@/lib/hand-ordering';

// Hand → allograph grouping for the per-image annotation gallery. Kept out of
// the gallery component so it can be unit-tested in isolation.

export interface AllographGroup {
  /** null holds the graphs that have no allograph yet. */
  allographId: number | null;
  allographName: string;
  graphs: BackendGraph[];
}

export interface HandGroup {
  handId: number | null;
  handName: string;
  allographs: AllographGroup[];
}

/** Names for groups that have no record to take one from; the gallery passes translations. */
export interface GroupLabels {
  unattributed: string;
  noAllograph: string;
  hand: (id: number) => string;
  allograph: (id: number) => string;
}

/**
 * Groups graphs by hand (in hand priority order, unattributed last), then by
 * allograph in the given sort. A graph without an allograph still counts on
 * the tab, so it is listed too, in a group of its own that always sorts last.
 */
export function groupAnnotations(
  graphs: BackendGraph[],
  hands: HandType[],
  allographs: AllographSummary[],
  labels: GroupLabels,
  sort: SortKey = DEFAULT_SORT
): HandGroup[] {
  const sortedHands = sortHandsByPriority(hands);
  const handLabelById = new Map(sortedHands.map((h) => [h.id, h.name]));
  const handRankById = new Map(sortedHands.map((h, index) => [h.id, index]));
  const allographLabelById = new Map(allographs.map((a) => [a.id, formatAllographLabel(a)]));
  const compare = allographGroupComparator(sort);
  const handMap = new Map<number | null, Map<number | null, BackendGraph[]>>();

  for (const graph of graphs) {
    const allographKey = typeof graph.allograph === 'number' ? graph.allograph : null;
    const handKey = typeof graph.hand === 'number' ? graph.hand : null;
    let allographMap = handMap.get(handKey);
    if (!allographMap) {
      allographMap = new Map();
      handMap.set(handKey, allographMap);
    }
    const list = allographMap.get(allographKey) ?? [];
    list.push(graph);
    allographMap.set(allographKey, list);
  }

  // Unattributed sorts after every hand, known or not.
  const rank = (handId: number | null) =>
    handId === null ? Number.MAX_VALUE : (handRankById.get(handId) ?? Number.MAX_SAFE_INTEGER);

  return Array.from(handMap, ([handKey, allographMap]) => ({
    handId: handKey,
    handName:
      handKey === null ? labels.unattributed : (handLabelById.get(handKey) ?? labels.hand(handKey)),
    allographs: Array.from(allographMap, ([allographId, graphs]) => ({
      allographId,
      allographName:
        allographId === null
          ? labels.noAllograph
          : (allographLabelById.get(allographId) ?? labels.allograph(allographId)),
      graphs,
    })).sort(
      (a, b) =>
        Number(a.allographId === null) - Number(b.allographId === null) ||
        compare(
          { allographName: a.allographName, count: a.graphs.length },
          { allographName: b.allographName, count: b.graphs.length }
        )
    ),
  })).sort((a, b) => rank(a.handId) - rank(b.handId) || a.handName.localeCompare(b.handName));
}

/**
 * What the gallery shows: the graph-level filters (hand, status, features,
 * positions) applied, grouped in the chosen sort, then the allograph-name
 * filter (case-insensitive substring) applied to the groups.
 */
export function filterAndGroup(
  graphs: BackendGraph[],
  filters: GalleryFilterState,
  hands: HandType[],
  allographs: AllographSummary[],
  labels: GroupLabels
): HandGroup[] {
  const groups = groupAnnotations(
    applyGraphFilters(graphs, filters),
    hands,
    allographs,
    labels,
    filters.sort
  );
  const needle = filters.allograph.trim().toLowerCase();
  if (!needle) return groups;
  return groups
    .map((hand) => ({
      ...hand,
      allographs: hand.allographs.filter((a) => a.allographName.toLowerCase().includes(needle)),
    }))
    .filter((hand) => hand.allographs.length > 0);
}

export const handAnchorId = (handId: number | null) => `hand-${handId ?? 'unattributed'}`;

// Stable, repeatable accent palette for visually separating hands (G6.9).
const HAND_ACCENTS = [
  '#2563eb',
  '#dc2626',
  '#059669',
  '#d97706',
  '#7c3aed',
  '#0891b2',
  '#db2777',
  '#65a30d',
];
export function handAccentColor(handId: number | null, index: number): string {
  if (handId === null) return '#94a3b8'; // slate for "Unattributed"
  return HAND_ACCENTS[index % HAND_ACCENTS.length];
}
