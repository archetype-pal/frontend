import type { BackendGraph } from '@/services/annotations';
import type { AllographSummary } from '@/types/allographs';
import type { HandType } from '@/types/hands';
import { formatAllographLabel } from '@/lib/allograph-labels';
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

export const NO_ALLOGRAPH_LABEL = 'No allograph';

/** Wraps an allograph-group comparator so the "no allograph" group always sorts last. */
export function withUnassignedLast<T extends { allographId: number | null }>(
  compare: (a: T, b: T) => number
) {
  return (a: T, b: T) => {
    if (a.allographId === null || b.allographId === null) {
      return (a.allographId === null ? 1 : 0) - (b.allographId === null ? 1 : 0);
    }
    return compare(a, b);
  };
}

export function groupAnnotations(
  graphs: BackendGraph[],
  hands: HandType[],
  allographs: AllographSummary[]
): HandGroup[] {
  const sortedHands = sortHandsByPriority(hands);
  const handLabelById = new Map(sortedHands.map((h) => [h.id, h.name]));
  const handRankById = new Map(sortedHands.map((h, index) => [h.id, index]));
  const allographLabelById = new Map(allographs.map((a) => [a.id, formatAllographLabel(a)]));
  const handMap = new Map<number | null, Map<number | null, BackendGraph[]>>();

  // A graph without an allograph still counts on the tab, so it is listed too,
  // under its own group, rather than dropped.
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

  return Array.from(handMap, ([handKey, allographMap]) => ({
    handId: handKey,
    handName: handKey === null ? 'Unattributed' : (handLabelById.get(handKey) ?? `Hand ${handKey}`),
    allographs: Array.from(allographMap, ([allographId, graphs]) => ({
      allographId,
      allographName:
        allographId === null
          ? NO_ALLOGRAPH_LABEL
          : (allographLabelById.get(allographId) ?? `Allograph ${allographId}`),
      graphs,
    })).sort(withUnassignedLast((a, b) => a.allographName.localeCompare(b.allographName))),
  })).sort((a, b) => {
    if (a.handId === null && b.handId === null) return 0;
    if (a.handId === null) return 1;
    if (b.handId === null) return -1;

    const rankDelta =
      (handRankById.get(a.handId) ?? Number.MAX_SAFE_INTEGER) -
      (handRankById.get(b.handId) ?? Number.MAX_SAFE_INTEGER);

    return rankDelta || a.handName.localeCompare(b.handName);
  });
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
