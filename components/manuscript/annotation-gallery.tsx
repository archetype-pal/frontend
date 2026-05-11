'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowUp, Check, ListChecks, Loader2, Square, Star } from 'lucide-react';

import { useIiifThumbnailUrl } from '@/hooks/use-iiif-thumbnail';
import { useAuth } from '@/contexts/auth-context';
import { useCollection, type CollectionItem } from '@/contexts/collection-context';
import type { Allograph } from '@/types/allographs';
import type { HandType } from '@/types/hands';
import { updateViewerAnnotation, type BackendGraph } from '@/services/annotations';
import { formatAllographLabel } from '@/lib/allograph-labels';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { SearchableOption } from '@/lib/searchable-option-ranking';

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
  allographs: Allograph[],
  pendingAllographs: Record<number, number> = {}
): HandGroup[] {
  const handLabelById = new Map(hands.map((h) => [h.id, h.name]));
  const allographLabelById = new Map(allographs.map((a) => [a.id, formatAllographLabel(a)]));
  const handMap = new Map<number | null, Map<number, BackendGraph[]>>();

  for (const graph of graphs) {
    // Pending optimistic reassignment from in-page edit takes precedence over
    // the server-rendered allograph until the next refresh.
    const effectiveAllograph = pendingAllographs[graph.id] ?? graph.allograph;
    if (typeof effectiveAllograph !== 'number') continue;

    const handKey = typeof graph.hand === 'number' ? graph.hand : null;
    let allographMap = handMap.get(handKey);
    if (!allographMap) {
      allographMap = new Map();
      handMap.set(handKey, allographMap);
    }
    const list = allographMap.get(effectiveAllograph) ?? [];
    list.push(graph);
    allographMap.set(effectiveAllograph, list);
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
  allographOptions: SearchableOption[];
  pendingAllographId: number | null;
  saveStatus: SaveStatus;
  onAllographChange: (graphId: number, allographId: number) => void;
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
  allographOptions,
  pendingAllographId,
  saveStatus,
  onAllographChange,
}: GraphThumbProps) {
  // Legacy GeoJSON polygons are stored with bottom-left origin (Web Mercator);
  // useIiifThumbnailUrl handles the y-flip and bounds clamping via info.json.
  const annotationJson = React.useMemo(() => JSON.stringify(graph.annotation), [graph.annotation]);
  const thumb = useIiifThumbnailUrl(iiifImage, annotationJson, 250);
  const href = `/manuscripts/${manuscriptId}/images/${imageId}?graph=${graph.id}`;

  // In annotating mode we stay on this page — the thumb becomes a selection
  // toggle (so power-users can shift-build a multi-graph selection) and the
  // edit picker takes over the navigation slot. In view mode it links into
  // the manuscript viewer like before.
  const thumbInner = thumb ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={thumb}
      alt={`Annotation ${graph.id}`}
      className="max-h-full max-w-full object-contain"
      loading="lazy"
    />
  ) : (
    <span className="text-xs text-muted-foreground">…</span>
  );
  const thumbClassName =
    'flex h-24 w-24 items-center justify-center overflow-hidden rounded bg-muted';
  const tooltipLabel = annotatingMode
    ? isSelected
      ? 'Unselect graph'
      : 'Select graph'
    : canEdit
      ? 'Edit graph'
      : 'View graph in the manuscript viewer';

  const effectiveAllographValue = String(pendingAllographId ?? graph.allograph ?? '');

  return (
    <div
      className={cn(
        'group relative flex flex-col gap-1 rounded border bg-card p-2 transition',
        isSelected ? 'border-primary ring-2 ring-primary/40' : 'border-border hover:border-primary'
      )}
    >
      <button
        type="button"
        onClick={onToggleSelected}
        aria-pressed={isSelected}
        aria-label={isSelected ? 'Unselect graph' : 'Select graph'}
        className={cn(
          'absolute left-1 top-1 z-10 flex h-5 w-5 items-center justify-center rounded border bg-background/80 text-[10px]',
          isSelected
            ? 'border-primary bg-primary text-primary-foreground'
            : 'border-muted-foreground/40 opacity-60 group-hover:opacity-100'
        )}
      >
        {isSelected ? '✓' : ''}
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

      {annotatingMode && (
        <div className="mt-1 w-[10rem] space-y-1">
          <div className="flex items-center gap-1">
            <SearchableSelect
              options={allographOptions}
              value={effectiveAllographValue || null}
              onValueChange={(v) => {
                if (!v) return;
                const next = Number(v);
                if (Number.isFinite(next) && next !== graph.allograph) {
                  onAllographChange(graph.id, next);
                }
              }}
              placeholder="Allograph…"
              searchPlaceholder="Search allographs…"
              emptyText="No allographs"
              triggerClassName="h-7 flex-1 text-[11px]"
              disabled={saveStatus === 'saving'}
            />
            <SaveIndicator status={saveStatus} />
          </div>
          <AnnotatingDetails graph={graph} />
        </div>
      )}
    </div>
  );
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

function SaveIndicator({ status }: { status: SaveStatus }) {
  if (status === 'saving') {
    return <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />;
  }
  if (status === 'saved') {
    return <Check className="h-3.5 w-3.5 text-emerald-600" />;
  }
  if (status === 'error') {
    return (
      <span className="text-[10px] font-medium text-destructive" title="Save failed">
        !
      </span>
    );
  }
  return <span className="h-3.5 w-3.5" aria-hidden />;
}

// ---------------------------------------------------------------------------
// Annotating-mode inline detail (admin)
// ---------------------------------------------------------------------------

function AnnotatingDetails({ graph }: { graph: BackendGraph }) {
  const components = graph.graphcomponent_set ?? [];
  const positions = graph.position_details ?? [];

  if (components.length === 0 && positions.length === 0) {
    return <p className="text-center text-[10px] italic text-muted-foreground">Undescribed</p>;
  }

  return (
    <div className="space-y-0.5 text-[10px] leading-tight text-muted-foreground">
      {components.map((c, i) => (
        <div key={`${c.component}-${i}`}>
          <span className="font-medium text-foreground">
            {c.component_name ?? `#${c.component}`}
          </span>
          {c.feature_details && c.feature_details.length > 0 && (
            <span> — {c.feature_details.map((f) => f.name).join(', ')}</span>
          )}
        </div>
      ))}
      {positions.length > 0 && (
        <div className="italic">{positions.map((p) => p.name).join(', ')}</div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Anchor IDs
// ---------------------------------------------------------------------------

const handAnchorId = (handId: number | null) => `hand-${handId ?? 'unattributed'}`;

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
  const { token, user } = useAuth();
  const { addItem, isInCollection } = useCollection();
  const canEdit = Boolean(user?.is_staff);

  const [selectedIds, setSelectedIds] = React.useState<Set<number>>(new Set());
  const [allographFilter, setAllographFilter] = React.useState('');
  const [annotatingMode, setAnnotatingMode] = React.useState(false);
  const [showBackToTop, setShowBackToTop] = React.useState(false);

  // Optimistic, locally-applied allograph reassignments. The server is the
  // source of truth, but writes are slow and we want the picker + thumbnail
  // group to update immediately. Reverted on save failure.
  const [pendingAllographs, setPendingAllographs] = React.useState<Record<number, number>>({});
  const [saveStatus, setSaveStatus] = React.useState<Record<number, SaveStatus>>({});
  const [bulkAllographValue, setBulkAllographValue] = React.useState<string | null>(null);
  const [bulkSaving, setBulkSaving] = React.useState(false);
  const [bulkError, setBulkError] = React.useState<string | null>(null);

  // Selection still works in annotating mode (it powers bulk-set), but the
  // "add to collection" affordances are swapped for "set allograph for N".
  const handleAnnotatingModeChange = React.useCallback((next: boolean) => {
    setAnnotatingMode(next);
    setBulkAllographValue(null);
    setBulkError(null);
  }, []);

  const allographOptions = React.useMemo<SearchableOption[]>(
    () =>
      allographs
        .map((a) => ({ value: String(a.id), label: formatAllographLabel(a) }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [allographs]
  );

  const markStatus = React.useCallback((id: number, status: SaveStatus) => {
    setSaveStatus((prev) => ({ ...prev, [id]: status }));
  }, []);

  const saveAllograph = React.useCallback(
    async (graphId: number, allographId: number) => {
      if (!token) {
        markStatus(graphId, 'error');
        return false;
      }
      setPendingAllographs((prev) => ({ ...prev, [graphId]: allographId }));
      markStatus(graphId, 'saving');
      try {
        await updateViewerAnnotation(token, graphId, { allograph: allographId });
        markStatus(graphId, 'saved');
        // Brief visual confirmation, then idle.
        window.setTimeout(() => markStatus(graphId, 'idle'), 1500);
        return true;
      } catch {
        // Revert the optimistic value so the picker snaps back to the saved one.
        setPendingAllographs((prev) => {
          const next = { ...prev };
          delete next[graphId];
          return next;
        });
        markStatus(graphId, 'error');
        return false;
      }
    },
    [markStatus, token]
  );

  // Show back-to-top once the user has scrolled meaningfully past the fold.
  // 600px is "past the Hands TOC and the first hand's allograph header on a
  // typical 1080p viewport" — a button that appears immediately would just
  // crowd the top of the page.
  React.useEffect(() => {
    const onScroll = () => setShowBackToTop(window.scrollY > 600);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const groups = React.useMemo(
    () => groupAnnotations(graphs, hands, allographs, pendingAllographs),
    [graphs, hands, allographs, pendingAllographs]
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

  const selectionCount = selectedIds.size;

  const toggleGraph = React.useCallback((id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAllInGroup = React.useCallback((groupGraphs: BackendGraph[]) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const g of groupGraphs) next.add(g.id);
      return next;
    });
  }, []);

  const unselectAllInGroup = React.useCallback((groupGraphs: BackendGraph[]) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const g of groupGraphs) next.delete(g.id);
      return next;
    });
  }, []);

  const clearSelection = React.useCallback(() => setSelectedIds(new Set()), []);

  // Build a CollectionItem from a graph. The page passes through
  // shelfmark/locus/iiif so the collection drawer can render the same
  // metadata it does for graphs added from the search results.
  const buildCollectionItem = React.useCallback(
    (graph: BackendGraph): CollectionItem => ({
      id: graph.id,
      type: 'graph',
      item_part: itemPartId,
      item_image: itemImageId,
      image_iiif: iiifImage,
      coordinates: JSON.stringify(graph.annotation),
      shelfmark,
      locus,
    }),
    [iiifImage, itemImageId, itemPartId, locus, shelfmark]
  );

  const addGroupToCollection = React.useCallback(
    (groupGraphs: BackendGraph[]) => {
      let added = 0;
      for (const g of groupGraphs) {
        if (!selectedIds.has(g.id)) continue;
        if (isInCollection(g.id, 'graph')) continue;
        addItem(buildCollectionItem(g));
        added += 1;
      }
      return added;
    },
    [addItem, buildCollectionItem, isInCollection, selectedIds]
  );

  const addAllSelectedToCollection = React.useCallback(() => {
    let added = 0;
    for (const handGroup of groups) {
      for (const allographGroup of handGroup.allographs) {
        for (const g of allographGroup.graphs) {
          if (!selectedIds.has(g.id)) continue;
          if (isInCollection(g.id, 'graph')) continue;
          addItem(buildCollectionItem(g));
          added += 1;
        }
      }
    }
    return added;
  }, [addItem, buildCollectionItem, groups, isInCollection, selectedIds]);

  if (groups.length === 0) {
    return (
      <div className="rounded-md border border-dashed bg-muted/40 p-6 text-sm text-muted-foreground">
        No annotations on this image yet.
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-8">
        {/* Top toolbar — filter + (admin) annotating-mode toggle + cross-group selection summary. */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border bg-card px-3 py-2">
          <div className="flex flex-1 items-center gap-3">
            <Input
              type="search"
              placeholder="Filter allographs…"
              value={allographFilter}
              onChange={(e) => setAllographFilter(e.target.value)}
              className="h-8 max-w-xs"
              aria-label="Filter allographs by name"
            />
            {canEdit && (
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <Switch
                  checked={annotatingMode}
                  onCheckedChange={handleAnnotatingModeChange}
                  aria-label="Annotating mode"
                />
                Annotating mode
              </label>
            )}
          </div>

          {selectionCount > 0 && (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-muted-foreground">{selectionCount} selected</span>
              {annotatingMode ? (
                <>
                  <SearchableSelect
                    options={allographOptions}
                    value={bulkAllographValue}
                    onValueChange={(v) => setBulkAllographValue(v)}
                    placeholder="Set allograph…"
                    searchPlaceholder="Search allographs…"
                    emptyText="No allographs"
                    triggerClassName="h-7 w-48 text-xs"
                    disabled={bulkSaving}
                  />
                  <Button
                    size="sm"
                    variant="default"
                    className="h-7 gap-1.5"
                    disabled={!bulkAllographValue || bulkSaving}
                    onClick={async () => {
                      if (!bulkAllographValue) return;
                      const allographId = Number(bulkAllographValue);
                      if (!Number.isFinite(allographId)) return;
                      setBulkSaving(true);
                      setBulkError(null);
                      const ids = Array.from(selectedIds);
                      const results = await Promise.all(
                        ids.map((gid) => saveAllograph(gid, allographId))
                      );
                      setBulkSaving(false);
                      const failed = results.filter((ok) => !ok).length;
                      if (failed > 0) setBulkError(`${failed} of ${ids.length} failed`);
                      else setBulkAllographValue(null);
                    }}
                  >
                    {bulkSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    Apply
                  </Button>
                  {bulkError && <span className="text-destructive">{bulkError}</span>}
                </>
              ) : (
                <Button
                  size="sm"
                  variant="default"
                  onClick={() => addAllSelectedToCollection()}
                  className="h-7 gap-1.5"
                >
                  <Star className="h-3.5 w-3.5" />
                  Add to collection
                </Button>
              )}
              <Button size="sm" variant="ghost" onClick={clearSelection} className="h-7">
                Clear
              </Button>
            </div>
          )}
        </div>

        {/* Hands TOC — only useful when there are 2+ hands to choose between. */}
        {filteredGroups.length > 1 && (
          <nav aria-label="Hands on this image">
            <h2 className="text-base font-semibold">Hands</h2>
            <ul className="mt-2 flex flex-wrap gap-2 text-sm">
              {filteredGroups.map((g) => (
                <li key={g.handId ?? 'unattributed'}>
                  <a
                    href={`#${handAnchorId(g.handId)}`}
                    className="rounded border bg-card px-2 py-1 hover:border-primary"
                  >
                    {g.handName}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        )}

        {filteredGroups.length === 0 && allographFilter.trim() && (
          <p className="text-sm text-muted-foreground">
            No allographs match &ldquo;{allographFilter.trim()}&rdquo;.
          </p>
        )}

        {filteredGroups.map((handGroup) => {
          const anchorId = handAnchorId(handGroup.handId);
          return (
            <section key={anchorId} id={anchorId}>
              <h2 className="text-lg font-semibold">{handGroup.handName}</h2>

              {/* Allograph quick-jump badges inside this hand. */}
              <ul className="mt-1 mb-3 flex flex-wrap gap-2 text-sm">
                {handGroup.allographs.map((a) => (
                  <li key={a.allographId}>
                    <a
                      href={`#${anchorId}-allograph-${a.allographId}`}
                      className="rounded border bg-muted px-2 py-0.5 text-muted-foreground hover:border-primary hover:text-foreground"
                    >
                      {a.allographName} ({a.graphs.length})
                    </a>
                  </li>
                ))}
              </ul>

              <div className="space-y-6">
                {handGroup.allographs.map((allographGroup) => {
                  const groupSelectedCount = allographGroup.graphs.filter((g) =>
                    selectedIds.has(g.id)
                  ).length;
                  const allSelected =
                    groupSelectedCount > 0 && groupSelectedCount === allographGroup.graphs.length;

                  return (
                    <div
                      key={allographGroup.allographId}
                      id={`${anchorId}-allograph-${allographGroup.allographId}`}
                      className="space-y-2"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h3 className="text-sm font-medium">
                          {allographGroup.allographName}{' '}
                          <span className="text-xs font-normal text-muted-foreground">
                            ({allographGroup.graphs.length})
                          </span>
                        </h3>

                        {/* Per-allograph toolbar: Select all / Unselect all stay
                            in annotating mode (powers bulk-set). The collection
                            button is the only annotating-mode casualty. */}
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 gap-1.5 text-xs"
                            onClick={() =>
                              allSelected
                                ? unselectAllInGroup(allographGroup.graphs)
                                : selectAllInGroup(allographGroup.graphs)
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
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 gap-1.5 text-xs"
                                  disabled={groupSelectedCount === 0}
                                  onClick={() => addGroupToCollection(allographGroup.graphs)}
                                >
                                  <Star className="h-3.5 w-3.5" />
                                  Add selected
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="top">
                                Add selected graphs to collection
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {allographGroup.graphs.map((graph) => (
                          <GraphThumb
                            key={graph.id}
                            graph={graph}
                            iiifImage={iiifImage}
                            manuscriptId={manuscriptId}
                            imageId={imageId}
                            isSelected={selectedIds.has(graph.id)}
                            onToggleSelected={() => toggleGraph(graph.id)}
                            canEdit={canEdit}
                            annotatingMode={annotatingMode}
                            allographOptions={allographOptions}
                            pendingAllographId={pendingAllographs[graph.id] ?? null}
                            saveStatus={saveStatus[graph.id] ?? 'idle'}
                            onAllographChange={saveAllograph}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}

        {/* Floating back-to-top — appears once the user has scrolled past the fold. */}
        {showBackToTop && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="default"
                className="fixed bottom-6 right-6 z-50 h-10 w-10 rounded-full shadow-lg"
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                aria-label="Back to top"
              >
                <ArrowUp className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">Back to top</TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
}
