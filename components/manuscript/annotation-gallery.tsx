'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { AlertTriangle, ArrowUp } from 'lucide-react';

import { useSelectionSet } from '@/hooks/use-selection-set';
import {
  UNDO_WINDOW_MS,
  useUndoableGraphDelete,
} from '@/hooks/manuscript/use-undoable-graph-delete';
import { useAuth } from '@/contexts/auth-context';
import { useCollection } from '@/contexts/collection-context';
import type { Allograph, AllographSummary } from '@/types/allographs';
import type { HandType } from '@/types/hands';
import type { BackendGraph } from '@/services/annotations';
import { fetchAllographs } from '@/services/manuscripts';
import { formatAllographLabel } from '@/lib/allograph-labels';
import { graphToCollectionItem } from '@/lib/collection-item';
import { downloadCsv, graphsToCsv } from '@/lib/graph-csv';
import { openLightboxWithItems } from '@/lib/lightbox-utils';
import { toast } from 'sonner';
import {
  type GroupLabels,
  groupAnnotations,
  handAccentColor,
  handAnchorId,
  withUnassignedLast,
} from '@/lib/annotation-gallery-groups';
import {
  type GalleryFilterState,
  EMPTY_FILTERS,
  allographGroupComparator,
  applyGraphFilters,
  collectFeatures,
  collectPositions,
  filtersFromParams,
  hasActiveFilters,
  isGraphDescribed,
  withFiltersInSearch,
} from '@/lib/annotation-gallery-filters';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AnnotationEditDialog } from '@/components/manuscript/annotation-edit-dialog';
import { useThumbDensity } from '@/components/manuscript/thumb-density';
import type {
  HandOption,
  StatusCounts,
} from '@/components/manuscript/annotation-gallery-filter-bar';
import { GalleryToolbar } from '@/components/manuscript/annotation-gallery-toolbar';
import { type GraphCollection, HandSection } from '@/components/manuscript/annotation-gallery-rows';
import { GallerySelectionBar } from '@/components/manuscript/annotation-gallery-selection-bar';

const trashToastId = (graphId: number) => `gallery-trash-${graphId}`;

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
  const tGallery = useTranslations('manuscript.gallery');
  const tCommon = useTranslations('common');
  const { user, token } = useAuth();
  const router = useRouter();
  const { addItem, removeItem, removeItems, isInCollection, isHydrated } = useCollection();
  const canEdit = user?.is_staff ?? false;
  // Editing needs the hand and allograph names; without them it would half-work.
  const editingAvailable = canEdit && !supportingDataIncomplete;
  const viewerHref = `/manuscripts/${manuscriptId}/images/${imageId}`;

  // Thumbnail density (G6.4), persisted across sessions.
  const [density, changeDensity] = useThumbDensity();

  // Optimistically removed graph ids (G3.1) — hidden immediately on delete.
  const [deletedIds, setDeletedIds] = React.useState<Set<number>>(() => new Set());

  const selection = useSelectionSet<number>();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Filter/sort state, initialised from the URL so a shared link reproduces
  // the view. Written back to the URL on change with history.replaceState, not
  // router.replace: this route renders on the server, so a router navigation
  // would re-run its fetches on every keystroke. Other params are kept.
  const [filters, setFilters] = React.useState<GalleryFilterState>(() =>
    filtersFromParams(new URLSearchParams(searchParams.toString()))
  );
  React.useEffect(() => {
    const qs = withFiltersInSearch(window.location.search, filters);
    const next = qs ? `${pathname}?${qs}` : pathname;
    if (next !== `${window.location.pathname}${window.location.search}`) {
      window.history.replaceState(null, '', next);
    }
  }, [filters, pathname]);

  const [annotatingMode, setAnnotatingMode] = React.useState(false);
  const [showBackToTop, setShowBackToTop] = React.useState(false);
  React.useEffect(() => {
    const onScroll = () => setShowBackToTop(window.scrollY > 600);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const filterInputRef = React.useRef<HTMLInputElement>(null);

  // Page-level keyboard shortcuts:
  //   `/`  — focus the allograph filter
  //   `A`  — toggle editing mode (staff only)
  // Both are skipped when the user is typing into a form field, so they don't
  // hijack normal input.
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (
        t &&
        (t.tagName === 'INPUT' ||
          t.tagName === 'TEXTAREA' ||
          t.tagName === 'SELECT' ||
          t.isContentEditable)
      ) {
        return;
      }
      if (e.key === '/') {
        e.preventDefault();
        filterInputRef.current?.focus();
      } else if ((e.key === 'a' || e.key === 'A') && editingAvailable) {
        e.preventDefault();
        setAnnotatingMode((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [editingAvailable]);

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
  // Its status reaches the dialog, which would otherwise offer an empty list
  // while the fetch runs and keep offering it after a failure.
  const [fullAllographs, setFullAllographs] = React.useState<Allograph[]>([]);
  const [fullAllographsStatus, setFullAllographsStatus] = React.useState<
    'idle' | 'loading' | 'ready' | 'error'
  >('idle');
  const allographsFetchRef = React.useRef<Promise<void> | null>(null);
  const ensureFullAllographs = React.useCallback(() => {
    if (allographsFetchRef.current) return;
    setFullAllographsStatus('loading');
    allographsFetchRef.current = fetchAllographs()
      .then((list) => {
        setFullAllographs(list);
        setFullAllographsStatus('ready');
      })
      .catch(() => {
        // Reset so a retry (or a later open) fetches again.
        allographsFetchRef.current = null;
        setFullAllographsStatus('error');
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

  // Delete a graph straight from the gallery (G3.1), staff-only. No confirm
  // dialog: the graph hides at once and the toast offers Undo until the
  // delete is sent. A sent delete refreshes the route, so the tab count drops.
  const showGraph = React.useCallback((graphId: number) => {
    setDeletedIds((prev) => {
      const next = new Set(prev);
      next.delete(graphId);
      return next;
    });
  }, []);
  const graphDelete = useUndoableGraphDelete({
    token,
    onHide: (graphId) => {
      setDeletedIds((prev) => new Set(prev).add(graphId));
      selection.remove(graphId);
    },
    onRestore: showGraph,
    onDeleted: (graphId) => {
      toast.dismiss(trashToastId(graphId));
      router.refresh();
    },
    onFailed: (graphId) => {
      toast.dismiss(trashToastId(graphId));
      toast.error(tGallery('deleteFailed', { id: graphId }));
    },
  });
  const handleDeleteGraph = React.useCallback(
    (graphId: number) => {
      if (!token) return;
      graphDelete.remove(graphId);
      toast.success(tGallery('trashed', { id: graphId }), {
        id: trashToastId(graphId),
        duration: UNDO_WINDOW_MS,
        action: {
          label: tGallery('undo'),
          onClick: () => {
            if (!graphDelete.undo(graphId)) {
              toast.info(tGallery('undoTooLate', { id: graphId }));
            }
          },
        },
      });
    },
    [token, graphDelete, tGallery]
  );

  const editingGraphs = React.useMemo(() => {
    if (!editingGraphIds) return [];
    const byId = new Map(effectiveGraphs.map((g) => [g.id, g]));
    return editingGraphIds
      .map((id) => byId.get(id))
      .filter((g): g is BackendGraph => g !== undefined);
  }, [editingGraphIds, effectiveGraphs]);

  const groupLabels = React.useMemo<GroupLabels>(
    () => ({
      unattributed: tGallery('unattributed'),
      noAllograph: tGallery('noAllograph'),
      hand: (id) => tGallery('handFallback', { id }),
      allograph: (id) => tGallery('allographFallback', { id }),
    }),
    [tGallery]
  );

  // Unfiltered grouping — drives the hand accents and the "is this image
  // genuinely empty?" check (vs. "filters excluded everything").
  const allGroups = React.useMemo(
    () => groupAnnotations(effectiveGraphs, hands, allographs, groupLabels),
    [effectiveGraphs, hands, allographs, groupLabels]
  );

  // Filter options derived from what's actually present, so dropdowns only
  // offer constraints that can match something.
  const handOptions = React.useMemo<HandOption[]>(() => {
    const present = new Set<number | null>();
    for (const g of effectiveGraphs) present.add(typeof g.hand === 'number' ? g.hand : null);
    const opts: HandOption[] = [];
    for (const h of hands) if (present.has(h.id)) opts.push({ key: h.id, name: h.name });
    if (present.has(null)) opts.push({ key: null, name: groupLabels.unattributed });
    return opts;
  }, [effectiveGraphs, hands, groupLabels]);
  const featureOptions = React.useMemo(() => collectFeatures(effectiveGraphs), [effectiveGraphs]);
  const positionOptions = React.useMemo(() => collectPositions(effectiveGraphs), [effectiveGraphs]);
  const statusCounts = React.useMemo<StatusCounts>(() => {
    const described = effectiveGraphs.filter(isGraphDescribed).length;
    return {
      all: effectiveGraphs.length,
      described,
      undescribed: effectiveGraphs.length - described,
    };
  }, [effectiveGraphs]);

  const handLabel = React.useCallback(
    (key: number | null) =>
      key === null
        ? groupLabels.unattributed
        : (handOptions.find((h) => h.key === key)?.name ?? groupLabels.hand(key)),
    [handOptions, groupLabels]
  );
  const featureLabel = React.useCallback(
    (id: number) =>
      featureOptions.find((f) => f.id === id)?.name ?? tGallery('featureFallback', { id }),
    [featureOptions, tGallery]
  );
  const positionLabel = React.useCallback(
    (id: number) =>
      positionOptions.find((p) => p.id === id)?.name ?? tGallery('positionFallback', { id }),
    [positionOptions, tGallery]
  );

  // Graph-level filters (hand / status / feature / position), then regroup and
  // apply the chosen allograph-group sort.
  const groups = React.useMemo(() => {
    const filteredGraphs = applyGraphFilters(effectiveGraphs, filters);
    const grouped = groupAnnotations(filteredGraphs, hands, allographs, groupLabels);
    const comparator = allographGroupComparator(filters.sort);
    return grouped.map((handGroup) => ({
      ...handGroup,
      allographs: [...handGroup.allographs].sort(
        withUnassignedLast((a, b) =>
          comparator(
            { allographName: a.allographName, count: a.graphs.length },
            { allographName: b.allographName, count: b.graphs.length }
          )
        )
      ),
    }));
  }, [effectiveGraphs, filters, hands, allographs, groupLabels]);

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

  const shownGraphs = React.useMemo(
    () => filteredGroups.flatMap((h) => h.allographs.flatMap((a) => a.graphs)),
    [filteredGroups]
  );
  const shownAllographCount = React.useMemo(
    () => filteredGroups.reduce((sum, g) => sum + g.allographs.length, 0),
    [filteredGroups]
  );

  // Selection actions only touch graphs on screen: a selected graph that the
  // filters now hide is counted in the bar but left out, and an id that is no
  // longer on the image at all (deleted, or gone after a refresh) is ignored.
  const selectedShown = React.useMemo(
    () => shownGraphs.filter((g) => selection.selected.has(g.id)),
    [shownGraphs, selection.selected]
  );
  const selectedHiddenCount = React.useMemo(
    () => effectiveGraphs.filter((g) => selection.selected.has(g.id)).length - selectedShown.length,
    [effectiveGraphs, selection.selected, selectedShown]
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
    if (selectedShown.length === 0) return;
    openLightboxWithItems(selectedShown.map((g) => ({ id: g.id, type: 'graph' as const })));
  }, [selectedShown]);

  // Export the selection as CSV (G4.3).
  const exportGraphs = React.useCallback(
    (rows: BackendGraph[]) => {
      const csv = graphsToCsv(
        rows.map((g) => ({
          graph: g,
          allograph: allographLabelById.get(g.allograph ?? -1) ?? '',
          hand: handLabel(typeof g.hand === 'number' ? g.hand : null),
        }))
      );
      downloadCsv(`annotations-${imageId}.csv`, csv);
    },
    [allographLabelById, handLabel, imageId]
  );

  const toCollectionItem = React.useCallback(
    (g: BackendGraph) =>
      graphToCollectionItem(
        g,
        { itemPartId, itemImageId, iiifImage, locus, shelfmark },
        { allographLabelById, handNameById }
      ),
    [allographLabelById, handNameById, iiifImage, itemImageId, itemPartId, locus, shelfmark]
  );

  // Adds the selected graphs on screen, says how many went in (and how many
  // were already there), and offers Undo for the ones it added.
  const addSelectedToCollection = React.useCallback(() => {
    const added = selectedShown.filter((g) => !isInCollection(g.id, 'graph'));
    const already = selectedShown.length - added.length;
    for (const g of added) addItem(toCollectionItem(g));
    selection.clear();
    if (added.length === 0) {
      toast.info(tGallery('collectionAlreadyThere', { count: already }));
      return;
    }
    toast.success(tGallery('collectionAdded', { count: added.length, already }), {
      action: {
        label: tGallery('undo'),
        onClick: () => removeItems(added.map((g) => ({ id: g.id, type: 'graph' as const }))),
      },
      cancel: {
        label: tGallery('viewCollection'),
        onClick: () => router.push('/collection'),
      },
    });
  }, [
    addItem,
    isInCollection,
    removeItems,
    router,
    selectedShown,
    selection,
    tGallery,
    toCollectionItem,
  ]);

  // The star on each graph: adds or removes just that graph, with Undo.
  const toggleGraphInCollection = React.useCallback(
    (g: BackendGraph) => {
      const toastId = `gallery-collection-${g.id}`;
      if (isInCollection(g.id, 'graph')) {
        removeItem(g.id, 'graph');
        toast.success(tGallery('collectionRemovedOne', { id: g.id }), {
          id: toastId,
          action: { label: tGallery('undo'), onClick: () => addItem(toCollectionItem(g)) },
        });
        return;
      }
      addItem(toCollectionItem(g));
      toast.success(tGallery('collectionAddedOne', { id: g.id }), {
        id: toastId,
        action: { label: tGallery('undo'), onClick: () => removeItem(g.id, 'graph') },
        cancel: { label: tGallery('viewCollection'), onClick: () => router.push('/collection') },
      });
    },
    [addItem, isInCollection, removeItem, router, tGallery, toCollectionItem]
  );
  const graphCollection = React.useMemo<GraphCollection>(
    () => ({
      ready: isHydrated,
      has: (graphId) => isInCollection(graphId, 'graph'),
      toggle: toggleGraphInCollection,
    }),
    [isHydrated, isInCollection, toggleGraphInCollection]
  );

  // The annotations fetch failed — show a recoverable error rather than the
  // empty state, which would falsely imply the image has no annotations.
  if (loadError) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-lg border border-destructive/30 bg-destructive/5 px-6 py-12 text-center">
        <AlertTriangle className="h-8 w-8 text-destructive" aria-hidden />
        <div className="max-w-md space-y-1">
          <p className="text-base font-semibold text-foreground">{tGallery('loadErrorTitle')}</p>
          <p className="text-sm text-muted-foreground">{tGallery('loadErrorBody')}</p>
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          <Button size="sm" onClick={() => router.refresh()}>
            {tCommon('tryAgain')}
          </Button>
          <Button size="sm" variant="outline" asChild>
            <Link href={viewerHref}>{tGallery('openViewer')}</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (allGroups.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed bg-card px-6 py-12 text-center">
        <div className="space-y-1">
          <p className="text-base font-semibold text-foreground">{tGallery('emptyTitle')}</p>
          <p className="text-sm text-muted-foreground">
            {canEdit ? tGallery('emptyStaff') : tGallery('emptyVisitor')}
          </p>
        </div>
        {canEdit && (
          <Button size="sm" asChild>
            <Link href={viewerHref}>{tGallery('openViewer')}</Link>
          </Button>
        )}
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-6">
        {supportingDataIncomplete && (
          <div
            role="alert"
            className="flex flex-wrap items-center gap-3 rounded-lg border border-amber-300 bg-amber-50 px-3.5 py-2.5 text-sm text-amber-900"
          >
            <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
            <span className="flex-1 basis-64">{tGallery('supportingDataFailed')}</span>
            <Button
              size="sm"
              variant="outline"
              className="border-amber-300 bg-transparent"
              onClick={() => router.refresh()}
            >
              {tCommon('tryAgain')}
            </Button>
          </div>
        )}

        <GalleryToolbar
          filters={filters}
          onFiltersChange={setFilters}
          onClearAllFilters={clearAllFilters}
          handOptions={handOptions}
          featureOptions={featureOptions}
          positionOptions={positionOptions}
          statusCounts={statusCounts}
          handLabel={handLabel}
          featureLabel={featureLabel}
          positionLabel={positionLabel}
          filterInputRef={filterInputRef}
          shownGraphs={shownGraphs.length}
          totalGraphs={effectiveGraphs.length}
          shownAllographs={shownAllographCount}
          density={density}
          onDensityChange={changeDensity}
          canEdit={canEdit}
          editingAvailable={editingAvailable}
          annotatingMode={annotatingMode}
          onAnnotatingModeChange={setAnnotatingMode}
        />

        {filteredGroups.length > 1 && (
          <nav aria-label={tGallery('handsNav')} className="flex flex-wrap items-center gap-2">
            <h2 className="mr-1 text-sm font-medium text-muted-foreground">
              {tGallery('handsHeading')}
            </h2>
            {filteredGroups.map((g) => {
              const count = g.allographs.reduce((sum, a) => sum + a.graphs.length, 0);
              return (
                <a
                  key={g.handId ?? 'unattributed'}
                  href={`#${handAnchorId(g.handId)}`}
                  className="inline-flex h-7 items-center gap-1.5 rounded-full border bg-card px-3 text-sm font-medium text-foreground transition hover:border-primary hover:text-primary"
                >
                  {g.handName}
                  <span className="tabular-nums text-muted-foreground">{count}</span>
                </a>
              );
            })}
          </nav>
        )}

        {filteredGroups.length === 0 && (
          <div className="rounded-lg border border-dashed bg-card px-5 py-10 text-center">
            <p className="text-base font-semibold text-foreground">{tGallery('noMatchTitle')}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {filters.allograph.trim() &&
              !allGroups.some((h) =>
                h.allographs.some((a) =>
                  a.allographName.toLowerCase().includes(filters.allograph.trim().toLowerCase())
                )
              )
                ? tGallery('noMatchName', { query: filters.allograph.trim() })
                : tGallery('noMatchCombined')}
            </p>
            {filtersActive && (
              <Button size="sm" variant="outline" className="mt-4" onClick={clearAllFilters}>
                {tGallery('clearAllFilters')}
              </Button>
            )}
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
            onEditGraph={(graphId) => openEditor([graphId])}
            onDeleteGraph={handleDeleteGraph}
            collection={graphCollection}
          />
        ))}

        <GallerySelectionBar
          shownCount={selectedShown.length}
          hiddenCount={selectedHiddenCount}
          annotatingMode={annotatingMode}
          onEdit={() => openEditor(selectedShown.map((g) => g.id))}
          onAddToCollection={addSelectedToCollection}
          onSendToLightbox={sendSelectionToLightbox}
          onExport={() => exportGraphs(selectedShown)}
          onClear={selection.clear}
        />

        {showBackToTop && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="outline"
                className="fixed bottom-6 right-6 z-50 h-11 w-11 rounded-full bg-card shadow-lg"
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                aria-label={tGallery('backToTop')}
              >
                <ArrowUp className="h-5 w-5" aria-hidden />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">{tGallery('backToTop')}</TooltipContent>
          </Tooltip>
        )}

        <AnnotationEditDialog
          open={editingGraphs.length > 0}
          onOpenChange={(open) => {
            if (!open) setEditingGraphIds(null);
          }}
          graphs={editingGraphs}
          allographs={fullAllographs}
          allographsStatus={
            fullAllographsStatus === 'loading' || fullAllographsStatus === 'error'
              ? fullAllographsStatus
              : undefined
          }
          onRetryAllographs={ensureFullAllographs}
          hands={hands}
          iiifImage={iiifImage}
          onGraphSaved={handleGraphSaved}
        />
      </div>
    </TooltipProvider>
  );
}
