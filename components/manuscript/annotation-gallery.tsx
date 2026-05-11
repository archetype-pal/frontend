'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowUp, ListChecks, Pencil, Square, Star } from 'lucide-react';

import { useIiifThumbnailUrl } from '@/hooks/use-iiif-thumbnail';
import { useAuth } from '@/contexts/auth-context';
import { useCollection, type CollectionItem } from '@/contexts/collection-context';
import type { Allograph } from '@/types/allographs';
import type { HandType } from '@/types/hands';
import type { BackendGraph } from '@/services/annotations';
import { formatAllographLabel } from '@/lib/allograph-labels';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AnnotationEditDialog } from '@/components/manuscript/annotation-edit-dialog';

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
  allographs: Allograph[]
): HandGroup[] {
  const handLabelById = new Map(hands.map((h) => [h.id, h.name]));
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
  })).sort((a, b) => a.handName.localeCompare(b.handName));
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
  allographs: Allograph[];
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
}: AnnotationGalleryProps) {
  const { user } = useAuth();
  const { addItem, isInCollection } = useCollection();
  const canEdit = user?.is_staff ?? false;

  const selection = useSelectionSet<number>();
  const [allographFilter, setAllographFilter] = React.useState('');
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

  // Dialog state — `editingGraphIds` is the list of graphs the dialog should
  // target. Resolved through `effectiveGraphs` so the dialog always sees the
  // freshest values after a save.
  const [editingGraphIds, setEditingGraphIds] = React.useState<number[] | null>(null);

  const effectiveGraphs = React.useMemo(
    () => graphs.map((g) => graphOverrides[g.id] ?? g),
    [graphs, graphOverrides]
  );

  const editingGraphs = React.useMemo(() => {
    if (!editingGraphIds) return [];
    const byId = new Map(effectiveGraphs.map((g) => [g.id, g]));
    return editingGraphIds
      .map((id) => byId.get(id))
      .filter((g): g is BackendGraph => g !== undefined);
  }, [editingGraphIds, effectiveGraphs]);

  const groups = React.useMemo(
    () => groupAnnotations(effectiveGraphs, hands, allographs),
    [effectiveGraphs, hands, allographs]
  );

  // Apply allograph filter (substring, case-insensitive) — drop allograph
  // groups whose name doesn't match, then drop hand groups left empty.
  const filteredGroups = React.useMemo(() => {
    const needle = allographFilter.trim().toLowerCase();
    if (!needle) return groups;
    return groups
      .map((handGroup) => ({
        ...handGroup,
        allographs: handGroup.allographs.filter((a) =>
          a.allographName.toLowerCase().includes(needle)
        ),
      }))
      .filter((handGroup) => handGroup.allographs.length > 0);
  }, [groups, allographFilter]);

  const totalAllographCount = React.useMemo(
    () => groups.reduce((sum, g) => sum + g.allographs.length, 0),
    [groups]
  );
  const filteredAllographCount = React.useMemo(
    () => filteredGroups.reduce((sum, g) => sum + g.allographs.length, 0),
    [filteredGroups]
  );

  // Single source of truth for "add graphs to the collection" — used by both
  // the per-allograph "Add selected" and the top toolbar's "Add to collection."
  const addToCollection = React.useCallback(
    (candidateGraphs: BackendGraph[]) => {
      for (const g of candidateGraphs) {
        if (!selection.selected.has(g.id)) continue;
        if (isInCollection(g.id, 'graph')) continue;
        addItem(buildCollectionItem(g, { itemPartId, itemImageId, iiifImage, locus, shelfmark }));
      }
    },
    [
      addItem,
      iiifImage,
      isInCollection,
      itemImageId,
      itemPartId,
      locus,
      selection.selected,
      shelfmark,
    ]
  );

  if (groups.length === 0) {
    return (
      <div className="rounded-md border border-dashed bg-muted/40 p-6 text-base text-muted-foreground">
        No annotations on this image yet.
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-10">
        <GalleryToolbar
          allographFilter={allographFilter}
          onAllographFilterChange={setAllographFilter}
          filterInputRef={filterInputRef}
          totalAllographCount={totalAllographCount}
          filteredAllographCount={filteredAllographCount}
          canEdit={canEdit}
          annotatingMode={annotatingMode}
          onAnnotatingModeChange={setAnnotatingMode}
          selectionCount={selection.selected.size}
          onClearSelection={selection.clear}
          onAddSelectedToCollection={() => addToCollection(effectiveGraphs)}
          onEditSelected={() => setEditingGraphIds(Array.from(selection.selected))}
          isScrolled={isScrolled}
        />

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

        {filteredGroups.length === 0 && allographFilter.trim() && (
          <div className="flex items-center justify-between gap-3 rounded-md border border-dashed bg-muted/40 px-4 py-3 text-base text-muted-foreground">
            <span>No allographs match &ldquo;{allographFilter.trim()}&rdquo;.</span>
            <Button size="sm" variant="ghost" onClick={() => setAllographFilter('')}>
              Clear filter
            </Button>
          </div>
        )}

        {filteredGroups.map((handGroup) => (
          <HandSection
            key={handGroup.handId ?? 'unattributed'}
            handGroup={handGroup}
            iiifImage={iiifImage}
            manuscriptId={manuscriptId}
            imageId={imageId}
            canEdit={canEdit}
            annotatingMode={annotatingMode}
            selection={selection}
            onAddGroupToCollection={addToCollection}
            onEditGraph={(graphId) => setEditingGraphIds([graphId])}
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
          allographs={allographs}
          hands={hands}
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
  allographFilter: string;
  onAllographFilterChange: (value: string) => void;
  filterInputRef: React.RefObject<HTMLInputElement | null>;
  totalAllographCount: number;
  filteredAllographCount: number;
  canEdit: boolean;
  annotatingMode: boolean;
  onAnnotatingModeChange: (value: boolean) => void;
  selectionCount: number;
  onClearSelection: () => void;
  onAddSelectedToCollection: () => void;
  onEditSelected: () => void;
  isScrolled: boolean;
}

function GalleryToolbar({
  allographFilter,
  onAllographFilterChange,
  filterInputRef,
  totalAllographCount,
  filteredAllographCount,
  canEdit,
  annotatingMode,
  onAnnotatingModeChange,
  selectionCount,
  onClearSelection,
  onAddSelectedToCollection,
  onEditSelected,
  isScrolled,
}: GalleryToolbarProps) {
  const isFiltering = allographFilter.trim().length > 0;
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
        'sticky top-4 z-30 -mx-1 flex flex-wrap items-center justify-between gap-3 rounded-md border bg-card/95 px-4 py-3 shadow-sm backdrop-blur transition-all duration-200 supports-[backdrop-filter]:bg-card/85',
        isScrolled ? 'ml-auto w-full sm:w-1/2' : 'w-auto'
      )}
    >
      <div className="flex flex-1 flex-wrap items-center gap-3">
        <div className="relative flex items-center gap-2">
          <Input
            ref={filterInputRef}
            type="search"
            placeholder="Filter allographs…"
            value={allographFilter}
            onChange={(e) => onAllographFilterChange(e.target.value)}
            className="h-9 w-64 pr-9 text-sm"
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
          <Button size="sm" variant="ghost" onClick={onClearSelection}>
            Clear
          </Button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Per-hand section
// ---------------------------------------------------------------------------

interface HandSectionProps {
  handGroup: HandGroup;
  iiifImage: string;
  manuscriptId: string;
  imageId: string;
  canEdit: boolean;
  annotatingMode: boolean;
  selection: SelectionSet<number>;
  onAddGroupToCollection: (graphs: BackendGraph[]) => void;
  onEditGraph: (graphId: number) => void;
}

function HandSection({
  handGroup,
  iiifImage,
  manuscriptId,
  imageId,
  canEdit,
  annotatingMode,
  selection,
  onAddGroupToCollection,
  onEditGraph,
}: HandSectionProps) {
  const anchorId = handAnchorId(handGroup.handId);
  return (
    <section id={anchorId} className="space-y-4">
      <header className="border-b pb-3">
        <h2 className="text-2xl font-semibold tracking-tight">{handGroup.handName}</h2>
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
            iiifImage={iiifImage}
            manuscriptId={manuscriptId}
            imageId={imageId}
            canEdit={canEdit}
            annotatingMode={annotatingMode}
            selection={selection}
            onAddGroupToCollection={() => onAddGroupToCollection(allographGroup.graphs)}
            onEditGraph={onEditGraph}
          />
        ))}
      </div>
    </section>
  );
}

interface AllographGroupSectionProps {
  anchorId: string;
  allographGroup: AllographGroup;
  iiifImage: string;
  manuscriptId: string;
  imageId: string;
  canEdit: boolean;
  annotatingMode: boolean;
  selection: SelectionSet<number>;
  onAddGroupToCollection: () => void;
  onEditGraph: (graphId: number) => void;
}

function AllographGroupSection({
  anchorId,
  allographGroup,
  iiifImage,
  manuscriptId,
  imageId,
  canEdit,
  annotatingMode,
  selection,
  onAddGroupToCollection,
  onEditGraph,
}: AllographGroupSectionProps) {
  const groupSelectedCount = allographGroup.graphs.filter((g) =>
    selection.selected.has(g.id)
  ).length;
  const allSelected = groupSelectedCount > 0 && groupSelectedCount === allographGroup.graphs.length;

  return (
    <div id={`${anchorId}-allograph-${allographGroup.allographId}`} className="space-y-3">
      {/* Sticky inside the section so the per-allograph actions follow the
          user down a long thumb grid. `top-[88px]` clears the page-level
          toolbar (top-4 offset + ~64px height + ~8px gap); bg-background/blur
          keeps the seam clean. Actions sit immediately next to the title
          (left-aligned cluster) instead of across the row, so the "Select
          all" / "Add selected" buttons are visually anchored to the
          allograph they act on. */}
      <div className="sticky top-[88px] z-20 -mx-1 flex flex-wrap items-center gap-3 rounded-md bg-background/95 px-1 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/85">
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

      <div className="flex flex-wrap gap-3">
        {allographGroup.graphs.map((graph) => (
          <GraphThumb
            key={graph.id}
            graph={graph}
            iiifImage={iiifImage}
            manuscriptId={manuscriptId}
            imageId={imageId}
            isSelected={selection.selected.has(graph.id)}
            onToggleSelected={() => selection.toggle(graph.id)}
            canEdit={canEdit}
            annotatingMode={annotatingMode}
            onEdit={() => onEditGraph(graph.id)}
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
  iiifImage: string;
  manuscriptId: string;
  imageId: string;
  isSelected: boolean;
  onToggleSelected: () => void;
  canEdit: boolean;
  annotatingMode: boolean;
  onEdit: () => void;
}

function GraphThumb({
  graph,
  iiifImage,
  manuscriptId,
  imageId,
  isSelected,
  onToggleSelected,
  canEdit,
  annotatingMode,
  onEdit,
}: GraphThumbProps) {
  // Legacy GeoJSON polygons are stored with bottom-left origin (Web Mercator);
  // useIiifThumbnailUrl handles the y-flip and bounds clamping via info.json.
  const annotationJson = React.useMemo(() => JSON.stringify(graph.annotation), [graph.annotation]);
  // 168px display × ~3× retina headroom — covers 2x sharply and 3x decently
  // without doubling bandwidth past usefulness.
  const thumb = useIiifThumbnailUrl(iiifImage, annotationJson, 500);
  const href = `/manuscripts/${manuscriptId}/images/${imageId}?graph=${graph.id}`;

  // In annotating mode the thumb is a selection toggle; the inline Edit
  // button is the way into the editor dialog. In view mode the thumb links
  // into the manuscript viewer like before.
  //
  // object-contain so the full glyph shows (object-cover would crop tall
  // or wide letters into the square). The container is transparent — no
  // muted bg, so the unfilled corners just show the page background and
  // there's still no visible "box" around the image. The bg-muted span
  // only surfaces while the IIIF thumb is loading.
  const thumbInner = thumb ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={thumb}
      alt={`Annotation ${graph.id}`}
      className="max-h-full max-w-full object-contain"
      loading="lazy"
    />
  ) : (
    <span className="flex h-full w-full items-center justify-center bg-muted text-xs text-muted-foreground">
      …
    </span>
  );
  // The allograph is the card — image fills a square that's larger than
  // the prior 96×96 so the glyph is actually readable. With the box gone
  // there's no chrome competing with the image. Selection / hover ring
  // is on the image element itself so it hugs the glyph instead of
  // wrapping the reserved footer slot below it.
  const thumbClassName = cn(
    'flex aspect-square w-[10.5rem] items-center justify-center overflow-hidden rounded transition',
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
    // No border, no card background, no padding — the allograph image is
    // the card. The selection ring lives on the image (see thumbClassName)
    // so it hugs the glyph and doesn't wrap the reserved footer slot.
    <div className="group relative flex flex-col gap-1.5">
      {/* Always-visible selection toggle. Bumped to 6×6 with a stronger
          contrast border so it reads as an interactive control even at rest,
          not just on hover. */}
      <button
        type="button"
        onClick={onToggleSelected}
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

      <Tooltip>
        <TooltipTrigger asChild>
          {annotatingMode ? (
            <button
              type="button"
              onClick={onToggleSelected}
              className={thumbClassName}
              aria-label={tooltipLabel}
            >
              {thumbInner}
            </button>
          ) : (
            <Link href={href} className={thumbClassName}>
              {thumbInner}
            </Link>
          )}
        </TooltipTrigger>
        <TooltipContent side="top">{tooltipLabel}</TooltipContent>
      </Tooltip>

      {/* When the user can edit (admin), always render the footer slot — even
          in view mode — so toggling annotating mode doesn't reflow the entire
          grid. Inactive footers are visibility:hidden but still take layout. */}
      {canEdit && (
        <div
          className={cn('mt-1 w-[10.5rem] space-y-1.5', !annotatingMode && 'invisible')}
          aria-hidden={!annotatingMode}
        >
          <Button
            size="sm"
            variant="outline"
            className="h-8 w-full gap-1.5 text-xs"
            onClick={onEdit}
            tabIndex={annotatingMode ? 0 : -1}
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </Button>
          <AnnotatingDetails graph={graph} />
        </div>
      )}
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

function buildCollectionItem(graph: BackendGraph, ctx: CollectionContext): CollectionItem {
  return {
    id: graph.id,
    type: 'graph',
    item_part: ctx.itemPartId,
    item_image: ctx.itemImageId,
    image_iiif: ctx.iiifImage,
    coordinates: JSON.stringify(graph.annotation),
    shelfmark: ctx.shelfmark,
    locus: ctx.locus,
  };
}
