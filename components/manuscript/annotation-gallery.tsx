'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { AlertTriangle, ArrowUp } from 'lucide-react';
import { toast } from 'sonner';

import { isEditableTarget } from '@/hooks/use-hotkeys';
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
import {
  type GroupLabels,
  filterAndGroup,
  groupAnnotations,
  handAccentColor,
  handAnchorId,
} from '@/lib/annotation-gallery-groups';
import {
  type GalleryFilterState,
  EMPTY_FILTERS,
  collectFeatures,
  collectPositions,
  filtersFromParams,
  isGraphDescribed,
  withFiltersInSearch,
} from '@/lib/annotation-gallery-filters';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AnnotationEditDialog } from '@/components/manuscript/annotation-edit-dialog';
import { useThumbDensity } from '@/components/manuscript/thumb-density';
import type { FilterOptions } from '@/components/manuscript/annotation-gallery-filter-bar';
import { GalleryToolbar } from '@/components/manuscript/annotation-gallery-toolbar';
import {
  type GalleryRowsContextValue,
  GalleryRowsProvider,
  HandSection,
} from '@/components/manuscript/annotation-gallery-rows';
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
  const t = useTranslations('manuscript.gallery');
  const tCommon = useTranslations('common');
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { addItem, removeItem, removeItems, isInCollection, isHydrated } = useCollection();
  const canEdit = user?.is_staff ?? false;
  // Editing needs the hand and allograph names; without them it would half-work.
  const editingAvailable = canEdit && !supportingDataIncomplete;
  const viewerHref = `/manuscripts/${manuscriptId}/images/${imageId}`;

  // Thumbnail density (G6.4), persisted across sessions.
  const [density, changeDensity] = useThumbDensity();
  const selection = useSelectionSet<number>();
  const [annotatingMode, setAnnotatingMode] = React.useState(false);

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

  const [showBackToTop, setShowBackToTop] = React.useState(false);
  React.useEffect(() => {
    const onScroll = () => setShowBackToTop(window.scrollY > 600);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // `/` focuses the allograph filter; `A` toggles editing mode. Neither fires
  // while typing in a field. Shift is not checked: `/` needs it on some layouts.
  const filterInputRef = React.useRef<HTMLInputElement>(null);
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isEditableTarget(e.target)) return;
      if (e.key === '/') {
        e.preventDefault();
        filterInputRef.current?.focus();
      } else if (e.key.toLowerCase() === 'a' && editingAvailable) {
        e.preventDefault();
        setAnnotatingMode((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [editingAvailable]);

  // Saved-graph overrides keep edits visible immediately (especially the
  // re-grouping that follows an allograph change) without waiting for a
  // route refresh. A fresh server load (new `graphs` identity, e.g. after
  // router.refresh()) drops them, using the "adjust state during render when
  // a prop changes" pattern so the reset lands before the children render.
  const [graphOverrides, setGraphOverrides] = React.useState<Record<number, BackendGraph>>({});
  const [prevGraphs, setPrevGraphs] = React.useState(graphs);
  if (prevGraphs !== graphs) {
    setPrevGraphs(graphs);
    setGraphOverrides({});
  }
  // Graphs hidden at once on delete (G3.1), until the delete is sent or undone.
  const [deletedIds, setDeletedIds] = React.useState<Set<number>>(() => new Set());
  const effectiveGraphs = React.useMemo(
    () => graphs.filter((g) => !deletedIds.has(g.id)).map((g) => graphOverrides[g.id] ?? g),
    [graphs, graphOverrides, deletedIds]
  );

  // Full allograph schema (components/positions) is only needed by the edit
  // dialog, so it is fetched on first open rather than on every page load (the
  // page sends labels-only summaries, G2.3). Its status reaches the dialog,
  // which would otherwise offer an empty list while loading or after a failure.
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

  // The graphs the edit dialog targets, resolved through `effectiveGraphs` so
  // it always sees the freshest values after a save.
  const [editingGraphIds, setEditingGraphIds] = React.useState<number[]>([]);
  const openEditor = React.useCallback(
    (ids: number[]) => {
      ensureFullAllographs();
      setEditingGraphIds(ids);
    },
    [ensureFullAllographs]
  );
  const editingGraphs = React.useMemo(
    () => effectiveGraphs.filter((g) => editingGraphIds.includes(g.id)),
    [editingGraphIds, effectiveGraphs]
  );

  // Delete without a confirm dialog: the graph hides at once and the toast
  // offers Undo until the delete is sent. A sent delete refreshes the route,
  // so the tab count drops.
  const graphDelete = useUndoableGraphDelete({
    isAuthenticated,
    onHide: (graphId) => {
      setDeletedIds((prev) => new Set(prev).add(graphId));
      selection.remove(graphId);
    },
    onRestore: (graphId) =>
      setDeletedIds((prev) => new Set([...prev].filter((id) => id !== graphId))),
    onDeleted: (graphId) => {
      toast.dismiss(trashToastId(graphId));
      router.refresh();
    },
    onFailed: (graphId) => {
      toast.dismiss(trashToastId(graphId));
      toast.error(t('deleteFailed', { id: graphId }));
    },
  });
  const deleteGraph = React.useCallback(
    (graphId: number) => {
      if (!isAuthenticated) return;
      graphDelete.remove(graphId);
      toast.success(t('trashed', { id: graphId }), {
        id: trashToastId(graphId),
        duration: UNDO_WINDOW_MS,
        action: {
          label: t('undo'),
          onClick: () => {
            if (!graphDelete.undo(graphId)) toast.info(t('undoTooLate', { id: graphId }));
          },
        },
      });
    },
    [isAuthenticated, graphDelete, t]
  );

  const groupLabels = React.useMemo<GroupLabels>(
    () => ({
      unattributed: t('unattributed'),
      noAllograph: t('noAllograph'),
      hand: (id) => t('handFallback', { id }),
      allograph: (id) => t('allographFallback', { id }),
    }),
    [t]
  );

  // Unfiltered grouping: drives the hand accents and tells an empty image
  // apart from filters that exclude everything.
  const allGroups = React.useMemo(
    () => groupAnnotations(effectiveGraphs, hands, allographs, groupLabels),
    [effectiveGraphs, hands, allographs, groupLabels]
  );
  const shownGroups = React.useMemo(
    () => filterAndGroup(effectiveGraphs, filters, hands, allographs, groupLabels),
    [effectiveGraphs, filters, hands, allographs, groupLabels]
  );
  const shownGraphs = React.useMemo(
    () => shownGroups.flatMap((h) => h.allographs.flatMap((a) => a.graphs)),
    [shownGroups]
  );

  // Filter options come from what is on the image, so they can all match.
  const filterOptions = React.useMemo<FilterOptions>(
    () => ({
      hands: allGroups.map((g) => ({ key: g.handId, name: g.handName })),
      features: collectFeatures(effectiveGraphs),
      positions: collectPositions(effectiveGraphs),
    }),
    [allGroups, effectiveGraphs]
  );
  const describedCount = effectiveGraphs.filter(isGraphDescribed).length;

  // Selection actions only touch graphs on screen: a selected graph the
  // filters hide is counted in the bar but left out, and an id no longer on
  // the image (deleted, or gone after a refresh) is ignored.
  const selectedShown = shownGraphs.filter((g) => selection.selected.has(g.id));
  const selectedHiddenCount =
    effectiveGraphs.filter((g) => selection.selected.has(g.id)).length - selectedShown.length;

  const allographLabelById = React.useMemo(
    () => new Map(allographs.map((a) => [a.id, formatAllographLabel(a)])),
    [allographs]
  );
  const handNameById = React.useMemo(() => new Map(hands.map((h) => [h.id, h.name])), [hands]);

  // Export the selection as CSV (G4.3). Real names only: the "Hand 5" fallback
  // is for the page, so a hand whose name is unknown gets an empty cell.
  const exportSelected = () =>
    downloadCsv(
      `annotations-${imageId}.csv`,
      graphsToCsv(
        selectedShown.map((g) => ({
          graph: g,
          allograph: allographLabelById.get(g.allograph ?? -1) ?? '',
          hand:
            typeof g.hand === 'number'
              ? (handNameById.get(g.hand) ?? '')
              : groupLabels.unattributed,
        }))
      )
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
  const viewCollection = { label: t('viewCollection'), onClick: () => router.push('/collection') };

  // Adds the selected graphs on screen, says how many went in (and how many
  // were already there), and offers Undo for the ones it added.
  const addSelectedToCollection = () => {
    const added = selectedShown.filter((g) => !isInCollection(g.id, 'graph'));
    const already = selectedShown.length - added.length;
    added.forEach((g) => addItem(toCollectionItem(g)));
    selection.clear();
    if (added.length === 0) {
      toast.info(t('collectionAlreadyThere', { count: already }));
      return;
    }
    toast.success(t('collectionAdded', { count: added.length, already }), {
      action: {
        label: t('undo'),
        onClick: () => removeItems(added.map((g) => ({ id: g.id, type: 'graph' as const }))),
      },
      cancel: viewCollection,
    });
  };

  // The star on each graph: adds or removes just that graph, with Undo.
  const toggleInCollection = (g: BackendGraph) => {
    const id = `gallery-collection-${g.id}`;
    if (isInCollection(g.id, 'graph')) {
      removeItem(g.id, 'graph');
      toast.success(t('collectionRemovedOne', { id: g.id }), {
        id,
        action: { label: t('undo'), onClick: () => addItem(toCollectionItem(g)) },
      });
    } else {
      addItem(toCollectionItem(g));
      toast.success(t('collectionAddedOne', { id: g.id }), {
        id,
        action: { label: t('undo'), onClick: () => removeItem(g.id, 'graph') },
        cancel: viewCollection,
      });
    }
  };

  const rows: GalleryRowsContextValue = {
    density,
    iiifImage: () => iiifImage,
    viewerHref: () => viewerHref,
    canEdit,
    annotatingMode,
    selection,
    onEditGraph: (graphId) => openEditor([graphId]),
    onDeleteGraph: deleteGraph,
    collection: {
      ready: isHydrated,
      has: (graphId) => isInCollection(graphId, 'graph'),
      toggle: toggleInCollection,
    },
  };

  // The annotations fetch failed — show a recoverable error rather than the
  // empty state, which would falsely imply the image has no annotations.
  if (loadError) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-lg border border-destructive/30 bg-destructive/5 px-6 py-12 text-center">
        <AlertTriangle className="h-8 w-8 text-destructive" aria-hidden />
        <div className="max-w-md space-y-1">
          <p className="text-base font-semibold text-foreground">{t('loadErrorTitle')}</p>
          <p className="text-sm text-muted-foreground">{t('loadErrorBody')}</p>
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          <Button size="sm" onClick={() => router.refresh()}>
            {tCommon('tryAgain')}
          </Button>
          <Button size="sm" variant="outline" asChild>
            <Link href={viewerHref}>{t('openViewer')}</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (allGroups.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed bg-card px-6 py-12 text-center">
        <div className="space-y-1">
          <p className="text-base font-semibold text-foreground">{t('emptyTitle')}</p>
          <p className="text-sm text-muted-foreground">
            {canEdit ? t('emptyStaff') : t('emptyVisitor')}
          </p>
        </div>
        {canEdit && (
          <Button size="sm" asChild>
            <Link href={viewerHref}>{t('openViewer')}</Link>
          </Button>
        )}
      </div>
    );
  }

  const nameQuery = filters.allograph.trim();
  const nameMatchesNothing =
    nameQuery !== '' &&
    !allGroups.some((h) =>
      h.allographs.some((a) => a.allographName.toLowerCase().includes(nameQuery.toLowerCase()))
    );

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-6">
        {supportingDataIncomplete && (
          <div
            role="alert"
            className="flex flex-wrap items-center gap-3 rounded-lg border border-amber-300 bg-amber-50 px-3.5 py-2.5 text-sm text-amber-900"
          >
            <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
            <span className="flex-1 basis-64">{t('supportingDataFailed')}</span>
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
          options={filterOptions}
          statusCounts={{
            all: effectiveGraphs.length,
            described: describedCount,
            undescribed: effectiveGraphs.length - describedCount,
          }}
          filterInputRef={filterInputRef}
          summary={{
            shown: shownGraphs.length,
            total: effectiveGraphs.length,
            groups: shownGroups.reduce((sum, h) => sum + h.allographs.length, 0),
          }}
          density={density}
          onDensityChange={changeDensity}
          editing={
            canEdit
              ? { on: annotatingMode, available: editingAvailable, onChange: setAnnotatingMode }
              : undefined
          }
        />

        {shownGroups.length > 1 && (
          <nav aria-label={t('handsNav')} className="flex flex-wrap items-center gap-2">
            <h2 className="mr-1 text-sm font-medium text-muted-foreground">{t('hands')}</h2>
            {shownGroups.map((g) => (
              <a
                key={g.handId ?? 'unattributed'}
                href={`#${handAnchorId(g.handId)}`}
                className="inline-flex h-7 items-center gap-1.5 rounded-full border bg-card px-3 text-sm font-medium text-foreground transition hover:border-primary hover:text-primary"
              >
                {g.handName}
                <span className="tabular-nums text-muted-foreground">
                  {g.allographs.reduce((sum, a) => sum + a.graphs.length, 0)}
                </span>
              </a>
            ))}
          </nav>
        )}

        {/* The image has graphs (checked above), so only the filters can hide them all. */}
        {shownGroups.length === 0 && (
          <div className="rounded-lg border border-dashed bg-card px-5 py-10 text-center">
            <p className="text-base font-semibold text-foreground">{t('noMatchTitle')}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {nameMatchesNothing ? t('noMatchName', { query: nameQuery }) : t('noMatchCombined')}
            </p>
            <Button
              size="sm"
              variant="outline"
              className="mt-4"
              onClick={() => setFilters(EMPTY_FILTERS)}
            >
              {t('clearAllFilters')}
            </Button>
          </div>
        )}

        <GalleryRowsProvider value={rows}>
          {shownGroups.map((handGroup) => (
            <HandSection
              key={handGroup.handId ?? 'unattributed'}
              handGroup={handGroup}
              // Accents follow the unfiltered order, so a hand keeps its colour
              // whatever the filters (G6.9).
              accent={handAccentColor(
                handGroup.handId,
                allGroups.findIndex((g) => g.handId === handGroup.handId)
              )}
            />
          ))}
        </GalleryRowsProvider>

        <GallerySelectionBar
          shownCount={selectedShown.length}
          hiddenCount={selectedHiddenCount}
          annotatingMode={annotatingMode}
          onEdit={() => openEditor(selectedShown.map((g) => g.id))}
          onAddToCollection={addSelectedToCollection}
          onSendToLightbox={() =>
            openLightboxWithItems(selectedShown.map((g) => ({ id: g.id, type: 'graph' as const })))
          }
          onExport={exportSelected}
          onClear={selection.clear}
        />

        {/* Gives way to the selection bar, which it would cover on a phone. */}
        {showBackToTop && selectedShown.length + selectedHiddenCount === 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="outline"
                className="fixed bottom-6 right-6 z-50 h-11 w-11 rounded-full bg-card shadow-lg"
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                aria-label={t('backToTop')}
              >
                <ArrowUp className="h-5 w-5" aria-hidden />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">{t('backToTop')}</TooltipContent>
          </Tooltip>
        )}

        <AnnotationEditDialog
          open={editingGraphs.length > 0}
          onOpenChange={(open) => {
            if (!open) setEditingGraphIds([]);
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
          onGraphSaved={(graph) => setGraphOverrides((prev) => ({ ...prev, [graph.id]: graph }))}
        />
      </div>
    </TooltipProvider>
  );
}
