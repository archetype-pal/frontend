'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  AlertTriangle,
  ArrowUp,
  Download,
  Images,
  ListChecks,
  Pencil,
  RefreshCw,
  Square,
  Star,
  Trash2,
} from 'lucide-react';

import { useIiifThumbnailUrl } from '@/hooks/use-iiif-thumbnail';
import { useInView } from '@/hooks/use-in-view';
import { useAuth } from '@/contexts/auth-context';
import { useCollection, type CollectionItem } from '@/contexts/collection-context';
import type { Allograph, AllographSummary } from '@/types/allographs';
import type { HandType } from '@/types/hands';
import type { BackendGraph } from '@/services/annotations';
import { deleteViewerAnnotation } from '@/services/annotations';
import { fetchAllographs } from '@/services/manuscripts';
import { formatAllographLabel } from '@/lib/allograph-labels';
import { escapeCsvField } from '@/lib/backoffice/csv-escape';
import { openLightboxWithItems } from '@/lib/lightbox-utils';
import { toast } from 'sonner';
import { sortHandsByPriority } from '@/lib/hand-ordering';
import {
  type GalleryFilterState,
  EMPTY_FILTERS,
  allographGroupComparator,
  applyGraphFilters,
  collectFeatures,
  collectPositions,
  filtersFromParams,
  filtersToQuery,
  hasActiveFilters,
  isGraphDescribed,
} from '@/lib/annotation-gallery-filters';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AnnotationEditDialog } from '@/components/manuscript/annotation-edit-dialog';
import {
  GalleryFilterChips,
  GalleryFilterControls,
  type HandOption,
} from '@/components/manuscript/annotation-gallery-filter-bar';

// ---------------------------------------------------------------------------
// Grouping
// ---------------------------------------------------------------------------

interface AllographGroup {
  allographId: number;
  allographName: string;
  graphs: BackendGraph[];
}

interface HandGroup {
  handId: number | null;
  handName: string;
  allographs: AllographGroup[];
}

function groupAnnotations(
  graphs: BackendGraph[],
  hands: HandType[],
  allographs: AllographSummary[]
): HandGroup[] {
  const sortedHands = sortHandsByPriority(hands);
  const handLabelById = new Map(sortedHands.map((h) => [h.id, h.name]));
  const handRankById = new Map(sortedHands.map((h, index) => [h.id, index]));
  const allographLabelById = new Map(allographs.map((a) => [a.id, formatAllographLabel(a)]));
  const handMap = new Map<number | null, Map<number, BackendGraph[]>>();

  for (const graph of graphs) {
    if (typeof graph.allograph !== 'number') continue;

    const handKey = typeof graph.hand === 'number' ? graph.hand : null;
    let allographMap = handMap.get(handKey);
    if (!allographMap) {
      allographMap = new Map();
      handMap.set(handKey, allographMap);
    }
    const list = allographMap.get(graph.allograph) ?? [];
    list.push(graph);
    allographMap.set(graph.allograph, list);
  }

  return Array.from(handMap, ([handKey, allographMap]) => ({
    handId: handKey,
    handName: handKey === null ? 'Unattributed' : (handLabelById.get(handKey) ?? `Hand ${handKey}`),
    allographs: Array.from(allographMap, ([allographId, graphs]) => ({
      allographId,
      allographName: allographLabelById.get(allographId) ?? `Allograph ${allographId}`,
      graphs,
    })).sort((a, b) => a.allographName.localeCompare(b.allographName)),
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

const handAnchorId = (handId: number | null) => `hand-${handId ?? 'unattributed'}`;

// ---------------------------------------------------------------------------
// Selection-set hook
// ---------------------------------------------------------------------------
//
// Encapsulates the four near-identical Set<id> mutators previously inlined
// in the gallery. Returns stable methods plus the live Set so callers can
// query membership without closing over individual ids.

interface SelectionSet<T> {
  selected: Set<T>;
  toggle: (id: T) => void;
  addMany: (ids: Iterable<T>) => void;
  removeMany: (ids: Iterable<T>) => void;
  clear: () => void;
}

function useSelectionSet<T>(): SelectionSet<T> {
  const [selected, setSelected] = React.useState<Set<T>>(() => new Set());

  return React.useMemo<SelectionSet<T>>(
    () => ({
      selected,
      toggle: (id) =>
        setSelected((prev) => {
          const next = new Set(prev);
          if (next.has(id)) next.delete(id);
          else next.add(id);
          return next;
        }),
      addMany: (ids) =>
        setSelected((prev) => {
          const next = new Set(prev);
          for (const id of ids) next.add(id);
          return next;
        }),
      removeMany: (ids) =>
        setSelected((prev) => {
          const next = new Set(prev);
          for (const id of ids) next.delete(id);
          return next;
        }),
      clear: () => setSelected(new Set()),
    }),
    [selected]
  );
}

// ---------------------------------------------------------------------------
// Top-level component
// ---------------------------------------------------------------------------

interface AnnotationGalleryProps {
  manuscriptId: string;
  imageId: string;
  itemImageId: number;
  itemPartId: number;
  iiifImage: string;
  locus: string;
  shelfmark: string;
  graphs: BackendGraph[];
  hands: HandType[];
  /** Lightweight allograph list (labels only) for grouping/filter. Full schema
   *  for the edit dialog is lazy-fetched on first open (see G2.3). */
  allographs: AllographSummary[];
  /** True when the annotations fetch itself failed — distinct from an image
   *  that genuinely has no annotations. */
  loadError?: boolean;
  /** True when hands/allographs failed to load — the gallery still renders
   *  but the filter and edit dialog are degraded. */
  supportingDataIncomplete?: boolean;
}

export function AnnotationGallery({
  manuscriptId,
  imageId,
  itemImageId,
  itemPartId,
  iiifImage,
  locus,
  shelfmark,
  graphs,
  hands,
  allographs,
  loadError = false,
  supportingDataIncomplete = false,
}: AnnotationGalleryProps) {
  const { user, token } = useAuth();
  const router = useRouter();
  const { addItem, isInCollection } = useCollection();
  const canEdit = user?.is_staff ?? false;

  // Thumbnail density (G6.4), persisted across sessions.
  const [density, setDensity] = React.useState<ThumbDensity>('comfortable');
  React.useEffect(() => {
    const saved = window.localStorage.getItem('annotation-gallery-density');
    // eslint-disable-next-line react-hooks/set-state-in-effect -- seed locally-owned state from localStorage after mount; deferring to an effect (vs. a lazy useState initializer) is required to avoid an SSR/client hydration mismatch, since `window` is unavailable during server render.
    if (saved === 'compact' || saved === 'comfortable' || saved === 'large') setDensity(saved);
  }, []);
  const changeDensity = React.useCallback((next: ThumbDensity) => {
    setDensity(next);
    window.localStorage.setItem('annotation-gallery-density', next);
  }, []);

  // Optimistically removed graph ids (G3.1) — hidden immediately on delete.
  const [deletedIds, setDeletedIds] = React.useState<Set<number>>(() => new Set());

  const selection = useSelectionSet<number>();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Filter/sort state, initialised from the URL so a shared link reproduces
  // the view. Written back to the URL (replace, no history entries) on change.
  const [filters, setFilters] = React.useState<GalleryFilterState>(() =>
    filtersFromParams(new URLSearchParams(searchParams.toString()))
  );
  React.useEffect(() => {
    const params = new URLSearchParams(filtersToQuery(filters));
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [filters, pathname, router]);

  const [annotatingMode, setAnnotatingMode] = React.useState(false);
  // Two scroll thresholds drive UI affordances:
  //   - isScrolled (>16px): the sticky toolbar collapses to the right half
  //     of the page so gallery content underneath stays visible on the left.
  //   - showBackToTop (>600px): the floating back-to-top button appears.
  const [isScrolled, setIsScrolled] = React.useState(false);
  const [showBackToTop, setShowBackToTop] = React.useState(false);
  React.useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setIsScrolled(y > 16);
      setShowBackToTop(y > 600);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const filterInputRef = React.useRef<HTMLInputElement>(null);

  // Page-level keyboard shortcuts:
  //   `/`  — focus the allograph filter
  //   `A`  — toggle annotating mode (admin only)
  // Both are skipped when the user is typing into a form field, so they don't
  // hijack normal input.
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) {
        return;
      }
      if (e.key === '/') {
        e.preventDefault();
        filterInputRef.current?.focus();
      } else if ((e.key === 'a' || e.key === 'A') && canEdit) {
        e.preventDefault();
        setAnnotatingMode((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [canEdit]);

  // Saved-graph overrides keep edits visible immediately (especially the
  // re-grouping that follows an allograph change) without waiting for a
  // route refresh. Each entry shadows the corresponding prop graph.
  const [graphOverrides, setGraphOverrides] = React.useState<Record<number, BackendGraph>>({});
  const handleGraphSaved = React.useCallback((graph: BackendGraph) => {
    setGraphOverrides((prev) => ({ ...prev, [graph.id]: graph }));
  }, []);

  // Drop optimistic overrides when a fresh server load arrives (a new `graphs`
  // prop identity, e.g. after router.refresh()) so re-fetched data wins
  // instead of being shadowed indefinitely by stale local edits. This is the
  // React "adjust state during render when a prop changes" pattern (tracked via
  // the previous `graphs` identity) rather than an effect, so the reset is
  // applied before the children render instead of in a follow-up commit.
  const [prevGraphs, setPrevGraphs] = React.useState(graphs);
  if (prevGraphs !== graphs) {
    setPrevGraphs(graphs);
    setGraphOverrides({});
  }

  // Dialog state — `editingGraphIds` is the list of graphs the dialog should
  // target. Resolved through `effectiveGraphs` so the dialog always sees the
  // freshest values after a save.
  const [editingGraphIds, setEditingGraphIds] = React.useState<number[] | null>(null);

  // Full allograph schema (components/positions) is only needed by the edit
  // dialog, so we lazy-fetch it on first open instead of paying for the whole
  // taxonomy on every page load (the page sends labels-only summaries). G2.3.
  const [fullAllographs, setFullAllographs] = React.useState<Allograph[]>([]);
  const allographsFetchRef = React.useRef<Promise<void> | null>(null);
  const ensureFullAllographs = React.useCallback(() => {
    if (allographsFetchRef.current) return;
    allographsFetchRef.current = fetchAllographs()
      .then(setFullAllographs)
      .catch(() => {
        // Reset so a later open can retry.
        allographsFetchRef.current = null;
      });
  }, []);
  const openEditor = React.useCallback(
    (ids: number[]) => {
      ensureFullAllographs();
      setEditingGraphIds(ids);
    },
    [ensureFullAllographs]
  );

  const effectiveGraphs = React.useMemo(
    () => graphs.filter((g) => !deletedIds.has(g.id)).map((g) => graphOverrides[g.id] ?? g),
    [graphs, graphOverrides, deletedIds]
  );

  // Delete a graph straight from the gallery (G3.1), admin-only. Optimistic:
  // hide it, then call the API; restore + toast on failure.
  const handleDeleteGraph = React.useCallback(
    async (graphId: number) => {
      if (!token) return;
      if (
        typeof window !== 'undefined' &&
        !window.confirm(`Delete graph #${graphId}? This cannot be undone.`)
      ) {
        return;
      }
      setDeletedIds((prev) => new Set(prev).add(graphId));
      try {
        await deleteViewerAnnotation(token, graphId);
        toast.success(`Graph #${graphId} deleted`);
      } catch {
        setDeletedIds((prev) => {
          const next = new Set(prev);
          next.delete(graphId);
          return next;
        });
        toast.error(`Failed to delete graph #${graphId}`);
      }
    },
    [token]
  );

  const editingGraphs = React.useMemo(() => {
    if (!editingGraphIds) return [];
    const byId = new Map(effectiveGraphs.map((g) => [g.id, g]));
    return editingGraphIds
      .map((id) => byId.get(id))
      .filter((g): g is BackendGraph => g !== undefined);
  }, [editingGraphIds, effectiveGraphs]);

  // Unfiltered grouping — drives the totals and the "is this image genuinely
  // empty?" check (vs. "filters excluded everything").
  const allGroups = React.useMemo(
    () => groupAnnotations(effectiveGraphs, hands, allographs),
    [effectiveGraphs, hands, allographs]
  );

  // Filter options derived from what's actually present, so dropdowns only
  // offer constraints that can match something.
  const handOptions = React.useMemo<HandOption[]>(() => {
    const present = new Set<number | null>();
    for (const g of effectiveGraphs) present.add(typeof g.hand === 'number' ? g.hand : null);
    const opts: HandOption[] = [];
    for (const h of hands) if (present.has(h.id)) opts.push({ key: h.id, name: h.name });
    if (present.has(null)) opts.push({ key: null, name: 'Unattributed' });
    return opts;
  }, [effectiveGraphs, hands]);
  const featureOptions = React.useMemo(() => collectFeatures(effectiveGraphs), [effectiveGraphs]);
  const positionOptions = React.useMemo(() => collectPositions(effectiveGraphs), [effectiveGraphs]);

  const handLabel = React.useCallback(
    (key: number | null) =>
      key === null
        ? 'Unattributed'
        : (handOptions.find((h) => h.key === key)?.name ?? `Hand ${key}`),
    [handOptions]
  );
  const featureLabel = React.useCallback(
    (id: number) => featureOptions.find((f) => f.id === id)?.name ?? `Feature ${id}`,
    [featureOptions]
  );
  const positionLabel = React.useCallback(
    (id: number) => positionOptions.find((p) => p.id === id)?.name ?? `Position ${id}`,
    [positionOptions]
  );

  // Graph-level filters (hand / status / feature / position), then regroup and
  // apply the chosen allograph-group sort.
  const groups = React.useMemo(() => {
    const filteredGraphs = applyGraphFilters(effectiveGraphs, filters);
    const grouped = groupAnnotations(filteredGraphs, hands, allographs);
    const comparator = allographGroupComparator(filters.sort);
    return grouped.map((handGroup) => ({
      ...handGroup,
      allographs: [...handGroup.allographs].sort((a, b) =>
        comparator(
          { allographName: a.allographName, count: a.graphs.length },
          { allographName: b.allographName, count: b.graphs.length }
        )
      ),
    }));
  }, [effectiveGraphs, filters, hands, allographs]);

  // Group-level allograph-name substring filter (case-insensitive).
  const filteredGroups = React.useMemo(() => {
    const needle = filters.allograph.trim().toLowerCase();
    if (!needle) return groups;
    return groups
      .map((handGroup) => ({
        ...handGroup,
        allographs: handGroup.allographs.filter((a) =>
          a.allographName.toLowerCase().includes(needle)
        ),
      }))
      .filter((handGroup) => handGroup.allographs.length > 0);
  }, [groups, filters.allograph]);

  const totalAllographCount = React.useMemo(
    () => allGroups.reduce((sum, g) => sum + g.allographs.length, 0),
    [allGroups]
  );
  const filteredAllographCount = React.useMemo(
    () => filteredGroups.reduce((sum, g) => sum + g.allographs.length, 0),
    [filteredGroups]
  );

  const filtersActive = hasActiveFilters(filters);
  const clearAllFilters = React.useCallback(() => setFilters(EMPTY_FILTERS), []);

  // Stable hand→accent assignment from the unfiltered order so a hand keeps its
  // colour regardless of active filters (G6.9).
  const handAccents = React.useMemo(() => {
    const m = new Map<number | null, string>();
    allGroups.forEach((g, i) => m.set(g.handId, handAccentColor(g.handId, i)));
    return m;
  }, [allGroups]);

  const allographLabelById = React.useMemo(
    () => new Map(allographs.map((a) => [a.id, formatAllographLabel(a)])),
    [allographs]
  );
  const handNameById = React.useMemo(
    () => new Map(hands.map((hand) => [hand.id, hand.name])),
    [hands]
  );

  // Open the current selection in the lightbox for side-by-side comparison (G4.1).
  const sendSelectionToLightbox = React.useCallback(() => {
    const ids = Array.from(selection.selected);
    if (ids.length === 0) return;
    openLightboxWithItems(ids.map((id) => ({ id, type: 'graph' as const })));
  }, [selection.selected]);

  // Export the selection (or, if nothing selected, the filtered view) as CSV (G4.3).
  const exportGraphs = React.useCallback(
    (rows: BackendGraph[]) => {
      const headers = [
        'id',
        'allograph',
        'hand',
        'described',
        'components',
        'features',
        'positions',
      ];
      const lines = rows.map((g) => {
        const components = (g.graphcomponent_set ?? []).map(
          (c) => c.component_name ?? `#${c.component}`
        );
        const features = (g.graphcomponent_set ?? []).flatMap((c) =>
          (c.feature_details ?? []).map((f) => f.name)
        );
        const positions = (g.position_details ?? []).map((p) => p.name);
        return [
          String(g.id),
          allographLabelById.get(g.allograph ?? -1) ?? '',
          g.hand === null || g.hand === undefined ? 'Unattributed' : handLabel(g.hand),
          isGraphDescribed(g) ? 'yes' : 'no',
          components.join('; '),
          features.join('; '),
          positions.join('; '),
        ]
          .map((v) => escapeCsvField(String(v)))
          .join(',');
      });
      const csv = [headers.map(escapeCsvField).join(','), ...lines].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `annotations-${imageId}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    },
    [allographLabelById, handLabel, imageId]
  );

  // Single source of truth for "add graphs to the collection" — used by both
  // the per-allograph "Add selected" and the top toolbar's "Add to collection."
  const addToCollection = React.useCallback(
    (candidateGraphs: BackendGraph[]) => {
      for (const g of candidateGraphs) {
        if (!selection.selected.has(g.id)) continue;
        if (isInCollection(g.id, 'graph')) continue;
        addItem(
          buildCollectionItem(
            g,
            { itemPartId, itemImageId, iiifImage, locus, shelfmark },
            { allographLabelById, handNameById }
          )
        );
      }
    },
    [
      addItem,
      allographLabelById,
      handNameById,
      iiifImage,
      isInCollection,
      itemImageId,
      itemPartId,
      locus,
      selection.selected,
      shelfmark,
    ]
  );

  // The annotations fetch failed — show a recoverable error rather than the
  // empty state, which would falsely imply the image has no annotations.
  if (loadError) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-md border border-destructive/30 bg-destructive/5 px-6 py-12 text-center">
        <AlertTriangle className="h-8 w-8 text-destructive" aria-hidden />
        <div className="space-y-1">
          <p className="text-base font-medium text-foreground">Couldn&apos;t load annotations</p>
          <p className="text-sm text-muted-foreground">
            Something went wrong fetching the annotations for this image.
          </p>
        </div>
        <Button variant="outline" size="sm" className="gap-2" onClick={() => router.refresh()}>
          <RefreshCw className="h-4 w-4" />
          Retry
        </Button>
      </div>
    );
  }

  if (allGroups.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-md border border-dashed bg-muted/40 px-6 py-12 text-center">
        <Square className="h-8 w-8 text-muted-foreground/50" aria-hidden />
        <div className="space-y-1">
          <p className="text-base font-medium text-foreground">No annotations on this image yet</p>
          {canEdit ? (
            <p className="text-sm text-muted-foreground">
              Open the{' '}
              <Link
                href={`/manuscripts/${manuscriptId}/images/${imageId}`}
                className="font-medium text-primary underline-offset-2 hover:underline"
              >
                image viewer
              </Link>{' '}
              to start drawing annotations.
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              This image hasn&apos;t been annotated yet.
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={200}>
      {/* Sticky offsets centralized here (G5.1): the toolbar pins at
          --gallery-sticky-top; the per-allograph header pins just below it at
          --gallery-sticky-top-2. Change the header height in one place. */}
      <div
        className="space-y-10"
        style={
          {
            '--gallery-sticky-top': '7rem',
            '--gallery-sticky-top-2': '12rem',
          } as React.CSSProperties
        }
      >
        {supportingDataIncomplete && (
          <div className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
            <span>
              Some reference data (hands or allographs) failed to load — filtering and editing may
              be incomplete.{' '}
              <button
                type="button"
                onClick={() => router.refresh()}
                className="font-medium underline underline-offset-2"
              >
                Retry
              </button>
            </span>
          </div>
        )}
        <GalleryToolbar
          filters={filters}
          onFiltersChange={setFilters}
          handOptions={handOptions}
          featureOptions={featureOptions}
          positionOptions={positionOptions}
          filterInputRef={filterInputRef}
          totalAllographCount={totalAllographCount}
          filteredAllographCount={filteredAllographCount}
          density={density}
          onDensityChange={changeDensity}
          canEdit={canEdit}
          annotatingMode={annotatingMode}
          onAnnotatingModeChange={setAnnotatingMode}
          selectionCount={selection.selected.size}
          onClearSelection={selection.clear}
          onAddSelectedToCollection={() => addToCollection(effectiveGraphs)}
          onEditSelected={() => openEditor(Array.from(selection.selected))}
          onSendToLightbox={sendSelectionToLightbox}
          onExportSelected={() =>
            exportGraphs(effectiveGraphs.filter((g) => selection.selected.has(g.id)))
          }
          isScrolled={isScrolled}
        />

        {filtersActive && (
          <GalleryFilterChips
            filters={filters}
            onChange={setFilters}
            onClearAll={clearAllFilters}
            handLabel={handLabel}
            featureLabel={featureLabel}
            positionLabel={positionLabel}
          />
        )}

        {filteredGroups.length > 1 && (
          <nav aria-label="Hands on this image">
            <h2 className="text-lg font-semibold">Hands</h2>
            <ul className="mt-3 flex flex-wrap gap-2 text-sm">
              {filteredGroups.map((g) => {
                const count = g.allographs.reduce((sum, a) => sum + a.graphs.length, 0);
                return (
                  <li key={g.handId ?? 'unattributed'}>
                    <a
                      href={`#${handAnchorId(g.handId)}`}
                      className="inline-flex items-center gap-2 rounded-md border bg-card px-3 py-1.5 font-medium text-foreground shadow-sm transition hover:border-primary hover:bg-primary/5"
                    >
                      {g.handName}
                      <span className="rounded-full bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground">
                        {count}
                      </span>
                    </a>
                  </li>
                );
              })}
            </ul>
          </nav>
        )}

        {filteredGroups.length === 0 && filtersActive && (
          <div className="flex items-center justify-between gap-3 rounded-md border border-dashed bg-muted/40 px-4 py-3 text-base text-muted-foreground">
            <span>No annotations match the current filters.</span>
            <Button size="sm" variant="ghost" onClick={clearAllFilters}>
              Clear all filters
            </Button>
          </div>
        )}

        {filteredGroups.map((handGroup) => (
          <HandSection
            key={handGroup.handId ?? 'unattributed'}
            handGroup={handGroup}
            accent={handAccents.get(handGroup.handId) ?? '#94a3b8'}
            density={density}
            iiifImage={iiifImage}
            manuscriptId={manuscriptId}
            imageId={imageId}
            canEdit={canEdit}
            annotatingMode={annotatingMode}
            selection={selection}
            onAddGroupToCollection={addToCollection}
            onEditGraph={(graphId) => openEditor([graphId])}
            onDeleteGraph={handleDeleteGraph}
          />
        ))}

        {showBackToTop && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="default"
                className="fixed bottom-6 right-6 z-50 h-12 w-12 rounded-full shadow-lg"
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                aria-label="Back to top"
              >
                <ArrowUp className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">Back to top</TooltipContent>
          </Tooltip>
        )}

        <AnnotationEditDialog
          open={editingGraphs.length > 0}
          onOpenChange={(open) => {
            if (!open) setEditingGraphIds(null);
          }}
          graphs={editingGraphs}
          allographs={fullAllographs}
          hands={hands}
          iiifImage={iiifImage}
          onGraphSaved={handleGraphSaved}
        />
      </div>
    </TooltipProvider>
  );
}

// ---------------------------------------------------------------------------
// Toolbar
// ---------------------------------------------------------------------------

interface GalleryToolbarProps {
  filters: GalleryFilterState;
  onFiltersChange: (next: GalleryFilterState) => void;
  handOptions: HandOption[];
  featureOptions: { id: number; name: string }[];
  positionOptions: { id: number; name: string }[];
  filterInputRef: React.RefObject<HTMLInputElement | null>;
  totalAllographCount: number;
  filteredAllographCount: number;
  density: ThumbDensity;
  onDensityChange: (value: ThumbDensity) => void;
  canEdit: boolean;
  annotatingMode: boolean;
  onAnnotatingModeChange: (value: boolean) => void;
  selectionCount: number;
  onClearSelection: () => void;
  onAddSelectedToCollection: () => void;
  onEditSelected: () => void;
  onSendToLightbox: () => void;
  onExportSelected: () => void;
  isScrolled: boolean;
}

function GalleryToolbar({
  filters,
  onFiltersChange,
  handOptions,
  featureOptions,
  positionOptions,
  filterInputRef,
  totalAllographCount,
  filteredAllographCount,
  density,
  onDensityChange,
  canEdit,
  annotatingMode,
  onAnnotatingModeChange,
  selectionCount,
  onClearSelection,
  onAddSelectedToCollection,
  onEditSelected,
  onSendToLightbox,
  onExportSelected,
  isScrolled,
}: GalleryToolbarProps) {
  const isFiltering = filters.allograph.trim().length > 0;
  return (
    // Sticky so the filter and selection actions stay reachable when scrolling
    // through long pages with many hands. `top-0` puts it just below whatever
    // the page-level layout's chrome ends up being; bg-card/backdrop-blur
    // keeps content behind it readable.
    // Once the page scrolls past the top, the toolbar shrinks to the right
    // half of the page so the gallery content is visible to its left
    // (margin-left: auto on a sized block right-aligns it).
    <div
      className={cn(
        // Sticky offset is driven by --gallery-sticky-top (set on the gallery
        // root) instead of a hard-coded literal, so it stays in sync with the
        // per-allograph header offset (G5.1).
        'sticky top-[var(--gallery-sticky-top,7rem)] z-30 -mx-1 flex flex-wrap items-center justify-between gap-3 rounded-md border bg-card/95 px-4 py-3 shadow-sm backdrop-blur transition-all duration-200 supports-[backdrop-filter]:bg-card/85',
        isScrolled ? 'ml-auto w-full lg:w-1/2' : 'w-full sm:w-auto'
      )}
    >
      <div className="flex flex-1 flex-wrap items-center gap-3">
        <div className="relative flex items-center gap-2">
          <Input
            ref={filterInputRef}
            type="search"
            placeholder="Filter allographs…"
            value={filters.allograph}
            onChange={(e) => onFiltersChange({ ...filters, allograph: e.target.value })}
            className="h-9 w-full pr-9 text-sm sm:w-56"
            aria-label="Filter allographs by name. Press / to focus."
          />
          {!isFiltering && (
            <Kbd className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2">/</Kbd>
          )}
          {isFiltering && (
            <span className="text-sm text-muted-foreground" aria-live="polite">
              {filteredAllographCount} of {totalAllographCount}
            </span>
          )}
        </div>

        <GalleryFilterControls
          filters={filters}
          onChange={onFiltersChange}
          handOptions={handOptions}
          featureOptions={featureOptions}
          positionOptions={positionOptions}
        />

        <DensityControl density={density} onChange={onDensityChange} />

        {canEdit && (
          <Tooltip>
            <TooltipTrigger asChild>
              <label
                className={cn(
                  'flex cursor-pointer items-center gap-2 rounded-md border px-3 py-1.5 text-sm transition',
                  annotatingMode
                    ? 'border-primary bg-primary/10 text-foreground'
                    : 'border-transparent text-muted-foreground hover:border-border hover:bg-muted/50'
                )}
              >
                <Switch
                  checked={annotatingMode}
                  onCheckedChange={onAnnotatingModeChange}
                  aria-label="Annotating mode"
                />
                Annotating mode
                <Kbd>A</Kbd>
              </label>
            </TooltipTrigger>
            <TooltipContent side="bottom">Toggle inline graph editing (press A)</TooltipContent>
          </Tooltip>
        )}
      </div>

      {selectionCount > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="rounded-full bg-primary/10 px-2.5 py-1 font-medium text-primary">
            {selectionCount} selected
          </span>
          {annotatingMode ? (
            <Button size="sm" variant="default" className="gap-1.5" onClick={onEditSelected}>
              <Pencil className="h-4 w-4" />
              Edit selected
            </Button>
          ) : (
            <Button
              size="sm"
              variant="default"
              className="gap-1.5"
              onClick={onAddSelectedToCollection}
            >
              <Star className="h-4 w-4" />
              Add to collection
            </Button>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="sm" variant="outline" className="gap-1.5" onClick={onSendToLightbox}>
                <Images className="h-4 w-4" />
                <span className="hidden sm:inline">Lightbox</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Compare selected in the lightbox</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="sm" variant="outline" className="gap-1.5" onClick={onExportSelected}>
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Export</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Export selected as CSV</TooltipContent>
          </Tooltip>
          <Button size="sm" variant="ghost" onClick={onClearSelection}>
            Clear
          </Button>
        </div>
      )}
    </div>
  );
}

// Thumbnail-size segmented control (G6.4).
function DensityControl({
  density,
  onChange,
}: {
  density: ThumbDensity;
  onChange: (value: ThumbDensity) => void;
}) {
  const options: { value: ThumbDensity; label: string; title: string }[] = [
    { value: 'compact', label: 'S', title: 'Compact thumbnails' },
    { value: 'comfortable', label: 'M', title: 'Comfortable thumbnails' },
    { value: 'large', label: 'L', title: 'Large thumbnails' },
  ];
  return (
    <div
      role="radiogroup"
      aria-label="Thumbnail size"
      className="inline-flex overflow-hidden rounded-md border"
    >
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          role="radio"
          aria-checked={density === opt.value}
          title={opt.title}
          onClick={() => onChange(opt.value)}
          className={cn(
            'border-l px-2.5 py-1.5 text-xs font-medium transition first:border-l-0',
            density === opt.value
              ? 'bg-primary text-primary-foreground'
              : 'bg-background text-muted-foreground hover:bg-muted hover:text-foreground'
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Per-hand section
// ---------------------------------------------------------------------------

export type ThumbDensity = 'compact' | 'comfortable' | 'large';

// Tailwind width classes per density (G6.4). Footer slot widths must match the
// thumb so the grid stays aligned.
const DENSITY_WIDTH: Record<ThumbDensity, string> = {
  compact: 'w-28',
  comfortable: 'w-[10.5rem]',
  large: 'w-56',
};
const DENSITY_THUMB_PX: Record<ThumbDensity, number> = {
  compact: 320,
  comfortable: 500,
  large: 700,
};

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
function handAccentColor(handId: number | null, index: number): string {
  if (handId === null) return '#94a3b8'; // slate for "Unattributed"
  return HAND_ACCENTS[index % HAND_ACCENTS.length];
}

interface HandSectionProps {
  handGroup: HandGroup;
  accent: string;
  density: ThumbDensity;
  iiifImage: string;
  manuscriptId: string;
  imageId: string;
  canEdit: boolean;
  annotatingMode: boolean;
  selection: SelectionSet<number>;
  onAddGroupToCollection: (graphs: BackendGraph[]) => void;
  onEditGraph: (graphId: number) => void;
  onDeleteGraph: (graphId: number) => void;
}

function HandSection({
  handGroup,
  accent,
  density,
  iiifImage,
  manuscriptId,
  imageId,
  canEdit,
  annotatingMode,
  selection,
  onAddGroupToCollection,
  onEditGraph,
  onDeleteGraph,
}: HandSectionProps) {
  const anchorId = handAnchorId(handGroup.handId);
  const totalGraphs = handGroup.allographs.reduce((sum, a) => sum + a.graphs.length, 0);
  return (
    <section id={anchorId} className="space-y-4">
      <header className="border-b border-l-4 pb-3 pl-3" style={{ borderLeftColor: accent }}>
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h2 className="text-2xl font-semibold tracking-tight">{handGroup.handName}</h2>
          {/* Per-hand signature summary (G4.2): glyph + allograph-variety counts. */}
          <span className="text-sm text-muted-foreground">
            {totalGraphs} {totalGraphs === 1 ? 'graph' : 'graphs'} · {handGroup.allographs.length}{' '}
            {handGroup.allographs.length === 1 ? 'allograph' : 'allographs'}
          </span>
        </div>
        <ul className="mt-3 flex flex-wrap gap-2 text-sm">
          {handGroup.allographs.map((a) => (
            <li key={a.allographId}>
              <a
                href={`#${anchorId}-allograph-${a.allographId}`}
                className="inline-flex items-center gap-1.5 rounded-md border bg-card px-2.5 py-1 text-foreground/80 transition hover:border-primary hover:text-foreground"
              >
                {a.allographName}
                <span className="rounded-full bg-muted px-1.5 text-xs font-medium text-muted-foreground">
                  {a.graphs.length}
                </span>
              </a>
            </li>
          ))}
        </ul>
      </header>

      <div className="space-y-8">
        {handGroup.allographs.map((allographGroup) => (
          <AllographGroupSection
            key={allographGroup.allographId}
            anchorId={anchorId}
            allographGroup={allographGroup}
            accent={accent}
            density={density}
            handName={handGroup.handName}
            iiifImage={iiifImage}
            manuscriptId={manuscriptId}
            imageId={imageId}
            canEdit={canEdit}
            annotatingMode={annotatingMode}
            selection={selection}
            onAddGroupToCollection={() => onAddGroupToCollection(allographGroup.graphs)}
            onEditGraph={onEditGraph}
            onDeleteGraph={onDeleteGraph}
          />
        ))}
      </div>
    </section>
  );
}

interface AllographGroupSectionProps {
  anchorId: string;
  allographGroup: AllographGroup;
  accent: string;
  density: ThumbDensity;
  handName: string;
  iiifImage: string;
  manuscriptId: string;
  imageId: string;
  canEdit: boolean;
  annotatingMode: boolean;
  selection: SelectionSet<number>;
  onAddGroupToCollection: () => void;
  onEditGraph: (graphId: number) => void;
  onDeleteGraph: (graphId: number) => void;
}

function AllographGroupSection({
  anchorId,
  allographGroup,
  accent,
  density,
  handName,
  iiifImage,
  manuscriptId,
  imageId,
  canEdit,
  annotatingMode,
  selection,
  onAddGroupToCollection,
  onEditGraph,
  onDeleteGraph,
}: AllographGroupSectionProps) {
  const groupSelectedCount = allographGroup.graphs.filter((g) =>
    selection.selected.has(g.id)
  ).length;
  const allSelected = groupSelectedCount > 0 && groupSelectedCount === allographGroup.graphs.length;

  // Anchor for shift-click range selection (G6.6): the last graph the user
  // toggled within this group.
  const lastSelectedRef = React.useRef<number | null>(null);
  const handleThumbSelect = (graphId: number, shiftKey: boolean) => {
    const ids = allographGroup.graphs.map((g) => g.id);
    if (shiftKey && lastSelectedRef.current != null) {
      const from = ids.indexOf(lastSelectedRef.current);
      const to = ids.indexOf(graphId);
      if (from !== -1 && to !== -1) {
        const [lo, hi] = from < to ? [from, to] : [to, from];
        selection.addMany(ids.slice(lo, hi + 1));
        lastSelectedRef.current = graphId;
        return;
      }
    }
    selection.toggle(graphId);
    lastSelectedRef.current = graphId;
  };

  // Arrow-key roving across the thumb grid (G3.4 / G5.2). Left/Right/Home/End
  // move focus between cells' focusable controls; vertical movement is left to
  // the browser's default tab order (column count is layout-dependent).
  const handleGridKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft' && e.key !== 'Home' && e.key !== 'End') {
      return;
    }
    const grid = e.currentTarget;
    const cells = Array.from(grid.querySelectorAll<HTMLElement>('[data-thumb-focusable]'));
    if (cells.length === 0) return;
    const current = document.activeElement as HTMLElement | null;
    const idx = current ? cells.indexOf(current) : -1;
    let next = idx;
    if (e.key === 'ArrowRight') next = idx < cells.length - 1 ? idx + 1 : 0;
    else if (e.key === 'ArrowLeft') next = idx > 0 ? idx - 1 : cells.length - 1;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = cells.length - 1;
    if (next !== idx && cells[next]) {
      e.preventDefault();
      cells[next].focus();
    }
  };

  return (
    <div id={`${anchorId}-allograph-${allographGroup.allographId}`} className="space-y-3">
      {/* Sticky inside the section so the per-allograph actions follow the
          user down a long thumb grid. `top-48` (192px) clears the page-level
          toolbar (top-28 offset + ~64px height + ~16px gap); bg-background
          + blur keeps the seam clean. Actions sit immediately next to the
          title (left-aligned cluster) instead of across the row, so the
          "Select all" / "Add selected" buttons are visually anchored to the
          allograph they act on. */}
      <div className="sticky top-[var(--gallery-sticky-top-2,12rem)] z-20 -mx-1 flex flex-wrap items-center gap-3 rounded-md bg-background/95 px-1 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/85">
        <h3 className="flex items-baseline gap-2 text-lg font-semibold">
          {allographGroup.allographName}
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
            {allographGroup.graphs.length}
          </span>
          {groupSelectedCount > 0 && (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
              {groupSelectedCount} selected
            </span>
          )}
        </h3>

        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            variant="outline"
            className="h-8 gap-1.5"
            onClick={() =>
              allSelected
                ? selection.removeMany(allographGroup.graphs.map((g) => g.id))
                : selection.addMany(allographGroup.graphs.map((g) => g.id))
            }
          >
            {allSelected ? (
              <>
                <Square className="h-3.5 w-3.5" />
                Unselect all
              </>
            ) : (
              <>
                <ListChecks className="h-3.5 w-3.5" />
                Select all
              </>
            )}
          </Button>

          {!annotatingMode && (
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1.5"
              disabled={groupSelectedCount === 0}
              onClick={onAddGroupToCollection}
            >
              <Star className="h-3.5 w-3.5" />
              Add selected
            </Button>
          )}
        </div>
      </div>

      <div
        role="grid"
        aria-label={`${allographGroup.allographName} graphs (${handName})`}
        className="flex flex-wrap gap-3"
        onKeyDown={handleGridKeyDown}
      >
        {allographGroup.graphs.map((graph) => (
          <GraphThumb
            key={graph.id}
            graph={graph}
            accent={accent}
            density={density}
            allographName={allographGroup.allographName}
            handName={handName}
            iiifImage={iiifImage}
            manuscriptId={manuscriptId}
            imageId={imageId}
            isSelected={selection.selected.has(graph.id)}
            onSelect={(shiftKey) => handleThumbSelect(graph.id, shiftKey)}
            canEdit={canEdit}
            annotatingMode={annotatingMode}
            onEdit={() => onEditGraph(graph.id)}
            onDelete={() => onDeleteGraph(graph.id)}
          />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Per-graph thumbnail
// ---------------------------------------------------------------------------

interface GraphThumbProps {
  graph: BackendGraph;
  accent: string;
  density: ThumbDensity;
  allographName: string;
  handName: string;
  iiifImage: string;
  manuscriptId: string;
  imageId: string;
  isSelected: boolean;
  onSelect: (shiftKey: boolean) => void;
  canEdit: boolean;
  annotatingMode: boolean;
  onEdit: () => void;
  onDelete: () => void;
}

function GraphThumb({
  graph,
  accent,
  density,
  allographName,
  handName,
  iiifImage,
  manuscriptId,
  imageId,
  isSelected,
  onSelect,
  canEdit,
  annotatingMode,
  onEdit,
  onDelete,
}: GraphThumbProps) {
  const href = `/manuscripts/${manuscriptId}/images/${imageId}?graph=${graph.id}`;
  const widthClass = DENSITY_WIDTH[density];

  // Selection ring + hover ring on the image element so it hugs the glyph.
  const thumbClassName = cn(
    'flex aspect-square items-center justify-center overflow-hidden rounded transition',
    widthClass,
    isSelected
      ? 'ring-2 ring-primary ring-offset-2'
      : 'hover:ring-2 hover:ring-primary/40 hover:ring-offset-2'
  );
  const tooltipLabel = annotatingMode
    ? isSelected
      ? 'Unselect graph'
      : 'Select graph'
    : canEdit
      ? 'Edit graph'
      : 'View graph in the manuscript viewer';

  return (
    // role=gridcell + content-visibility:auto so offscreen thumbs skip layout
    // and paint work on dense folios (G2.2). contain-intrinsic-size reserves
    // roughly the rendered height to avoid scrollbar jump.
    <div
      role="gridcell"
      className="group relative flex flex-col gap-1.5"
      style={{ contentVisibility: 'auto', containIntrinsicSize: 'auto 12rem' }}
    >
      {/* Always-visible selection toggle. */}
      <button
        type="button"
        onClick={(e) => onSelect(e.shiftKey)}
        aria-pressed={isSelected}
        aria-label={isSelected ? 'Unselect graph' : 'Select graph'}
        className={cn(
          'absolute left-1.5 top-1.5 z-10 flex h-6 w-6 items-center justify-center rounded-md border text-xs shadow-sm transition',
          isSelected
            ? 'border-primary bg-primary text-primary-foreground'
            : 'border-foreground/30 bg-background/95 text-transparent hover:border-primary hover:text-primary group-hover:text-muted-foreground'
        )}
      >
        ✓
      </button>

      {/* Per-hand accent dot (G6.9). */}
      <span
        aria-hidden
        className="absolute right-1.5 top-1.5 z-10 h-2.5 w-2.5 rounded-full ring-1 ring-background"
        style={{ backgroundColor: accent }}
      />

      <Tooltip>
        <TooltipTrigger asChild>
          {annotatingMode ? (
            <button
              type="button"
              data-thumb-focusable
              onClick={(e) => onSelect(e.shiftKey)}
              className={thumbClassName}
              aria-label={tooltipLabel}
            >
              <GraphThumbImage graph={graph} iiifImage={iiifImage} density={density} />
            </button>
          ) : (
            <Link href={href} data-thumb-focusable className={thumbClassName}>
              <GraphThumbImage graph={graph} iiifImage={iiifImage} density={density} />
            </Link>
          )}
        </TooltipTrigger>
        {/* Hover peek (G6.5): richer context without entering annotating mode. */}
        <TooltipContent side="top" className="max-w-xs">
          <GraphPeek
            graph={graph}
            allographName={allographName}
            handName={handName}
            actionLabel={tooltipLabel}
          />
        </TooltipContent>
      </Tooltip>

      {/* When the user can edit (admin), always render the footer slot — even
          in view mode — so toggling annotating mode doesn't reflow the grid. */}
      {canEdit && (
        <div
          className={cn('mt-1 space-y-1.5', widthClass, !annotatingMode && 'invisible')}
          aria-hidden={!annotatingMode}
        >
          <div className="flex gap-1.5">
            <Button
              size="sm"
              variant="outline"
              className="h-8 flex-1 gap-1.5 text-xs"
              onClick={onEdit}
              tabIndex={annotatingMode ? 0 : -1}
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1.5 px-2 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={onDelete}
              tabIndex={annotatingMode ? 0 : -1}
              aria-label={`Delete graph #${graph.id}`}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
          <AnnotatingDetails graph={graph} />
        </div>
      )}
    </div>
  );
}

// Lazy IIIF thumbnail — only resolves its bounded URL once scrolled into view
// (G2.1), so a dense folio doesn't fire hundreds of info.json-driven requests
// on mount. Kept as its own component so the hook is gated behind the
// in-view check.
function GraphThumbImage({
  graph,
  iiifImage,
  density,
}: {
  graph: BackendGraph;
  iiifImage: string;
  density: ThumbDensity;
}) {
  const ref = React.useRef<HTMLSpanElement>(null);
  const inView = useInView(ref);
  return (
    <span ref={ref} className="flex aspect-square h-full w-full items-center justify-center">
      {inView ? (
        <LoadedThumbImage graph={graph} iiifImage={iiifImage} density={density} />
      ) : (
        <span className="flex h-full w-full items-center justify-center bg-muted text-xs text-muted-foreground">
          …
        </span>
      )}
    </span>
  );
}

function LoadedThumbImage({
  graph,
  iiifImage,
  density,
}: {
  graph: BackendGraph;
  iiifImage: string;
  density: ThumbDensity;
}) {
  // Legacy GeoJSON polygons are stored bottom-left origin (Web Mercator);
  // useIiifThumbnailUrl handles the y-flip and bounds clamping via info.json.
  const annotationJson = React.useMemo(() => JSON.stringify(graph.annotation), [graph.annotation]);
  const thumb = useIiifThumbnailUrl(iiifImage, annotationJson, DENSITY_THUMB_PX[density]);
  if (!thumb) {
    return (
      <span className="flex h-full w-full items-center justify-center bg-muted text-xs text-muted-foreground">
        …
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={thumb}
      alt={`Annotation ${graph.id}`}
      className="max-h-full max-w-full object-contain"
      loading="lazy"
    />
  );
}

// Hover-peek body: allograph, hand, and described features/positions.
function GraphPeek({
  graph,
  allographName,
  handName,
  actionLabel,
}: {
  graph: BackendGraph;
  allographName: string;
  handName: string;
  actionLabel: string;
}) {
  const components = graph.graphcomponent_set ?? [];
  const positions = graph.position_details ?? [];
  return (
    <div className="space-y-1 text-xs">
      <div className="font-medium text-foreground">{allographName}</div>
      <div className="text-muted-foreground">{handName}</div>
      {components.length > 0 && (
        <div className="text-muted-foreground">
          {components
            .map((c) =>
              c.feature_details && c.feature_details.length > 0
                ? `${c.component_name ?? `#${c.component}`}: ${c.feature_details.map((f) => f.name).join(', ')}`
                : (c.component_name ?? `#${c.component}`)
            )
            .join(' · ')}
        </div>
      )}
      {positions.length > 0 && (
        <div className="italic text-muted-foreground">
          {positions.map((p) => p.name).join(', ')}
        </div>
      )}
      {components.length === 0 && positions.length === 0 && (
        <div className="italic text-muted-foreground">Undescribed</div>
      )}
      <div className="pt-0.5 text-muted-foreground/80">{actionLabel}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Annotating-mode inline detail (admin)
// ---------------------------------------------------------------------------

function AnnotatingDetails({ graph }: { graph: BackendGraph }) {
  const components = graph.graphcomponent_set ?? [];
  const positions = graph.position_details ?? [];

  if (components.length === 0 && positions.length === 0) {
    return <p className="text-center text-[11px] italic text-muted-foreground/80">Undescribed</p>;
  }

  return (
    // Bumped from 10px (verging on illegible) to 11px with stronger contrast
    // for the supporting feature/position text. Component names use the
    // foreground colour for readable scanning at 11px.
    <div className="space-y-0.5 text-[11px] leading-snug text-muted-foreground">
      {components.map((c, i) => (
        <div key={`${c.component}-${i}`}>
          <span className="font-medium text-foreground">
            {c.component_name ?? `#${c.component}`}
          </span>
          {c.feature_details && c.feature_details.length > 0 && (
            <span className="text-foreground/70">
              {' — '}
              {c.feature_details.map((f) => f.name).join(', ')}
            </span>
          )}
        </div>
      ))}
      {positions.length > 0 && (
        <div className="italic text-foreground/70">{positions.map((p) => p.name).join(', ')}</div>
      )}
    </div>
  );
}

// Tiny inline keyboard-shortcut chip; styled like the GitHub/Linear pattern.
function Kbd({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <kbd
      className={cn(
        'inline-flex h-4 min-w-4 items-center justify-center rounded border bg-muted px-1 font-sans text-[10px] font-medium text-muted-foreground',
        className
      )}
    >
      {children}
    </kbd>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface CollectionContext {
  itemPartId: number;
  itemImageId: number;
  iiifImage: string;
  locus: string;
  shelfmark: string;
}

interface CollectionLabels {
  allographLabelById: ReadonlyMap<number, string>;
  handNameById: ReadonlyMap<number, string>;
}

function buildCollectionItem(
  graph: BackendGraph,
  ctx: CollectionContext,
  labels: CollectionLabels
): CollectionItem {
  return {
    id: graph.id,
    type: 'graph',
    item_part: ctx.itemPartId,
    item_image: ctx.itemImageId,
    image_iiif: ctx.iiifImage,
    coordinates: JSON.stringify(graph.annotation),
    annotation_type: graph.annotation_type,
    allograph:
      graph.allograph === null ? undefined : labels.allographLabelById.get(graph.allograph),
    hand_name: graph.hand === null ? undefined : labels.handNameById.get(graph.hand),
    shelfmark: ctx.shelfmark,
    locus: ctx.locus,
  };
}
