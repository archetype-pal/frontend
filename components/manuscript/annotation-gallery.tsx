'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowUp, ListChecks, Square, Star } from 'lucide-react';

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
  selectionEnabled: boolean;
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
  selectionEnabled,
}: GraphThumbProps) {
  // Legacy GeoJSON polygons are stored with bottom-left origin (Web Mercator);
  // useIiifThumbnailUrl handles the y-flip and bounds clamping via info.json.
  const annotationJson = React.useMemo(() => JSON.stringify(graph.annotation), [graph.annotation]);
  const thumb = useIiifThumbnailUrl(iiifImage, annotationJson, 250);
  const href = `/manuscripts/${manuscriptId}/images/${imageId}?graph=${graph.id}`;
  const tooltipLabel = canEdit ? 'Edit graph' : 'View graph in the manuscript viewer';

  return (
    <div
      className={cn(
        'group relative flex flex-col gap-1 rounded border bg-card p-2 transition',
        isSelected ? 'border-primary ring-2 ring-primary/40' : 'border-border hover:border-primary'
      )}
    >
      {/* Selection toggle: hidden in annotating mode — that mode is for editing,
          not for building a collection, so the add-to-collection workflow is off. */}
      {selectionEnabled && (
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
      )}

      <Tooltip>
        <TooltipTrigger asChild>
          <Link
            href={href}
            className="flex h-24 w-24 items-center justify-center overflow-hidden rounded bg-muted"
          >
            {thumb ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={thumb}
                alt={`Annotation ${graph.id}`}
                className="max-h-full max-w-full object-contain"
                loading="lazy"
              />
            ) : (
              <span className="text-xs text-muted-foreground">…</span>
            )}
          </Link>
        </TooltipTrigger>
        <TooltipContent side="top">{tooltipLabel}</TooltipContent>
      </Tooltip>

      {annotatingMode && <AnnotatingDetails graph={graph} />}
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
    return (
      <p className="mt-1 max-w-[10rem] text-center text-[10px] italic text-muted-foreground">
        Undescribed
      </p>
    );
  }

  return (
    <div className="mt-1 max-w-[10rem] space-y-1 text-[10px] leading-tight text-muted-foreground">
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
  const { user } = useAuth();
  const { addItem, isInCollection } = useCollection();
  const canEdit = Boolean(user?.is_staff);

  const [selectedIds, setSelectedIds] = React.useState<Set<number>>(new Set());
  const [allographFilter, setAllographFilter] = React.useState('');
  const [annotatingMode, setAnnotatingMode] = React.useState(false);
  const [showBackToTop, setShowBackToTop] = React.useState(false);

  // Annotating mode is an editor-focused view; the add-to-collection workflow
  // (selection + per-group/global "Add to collection" buttons) is hidden while
  // it's on. Drop any in-flight selection so toggling back later starts clean.
  const selectionEnabled = !annotatingMode;
  const handleAnnotatingModeChange = React.useCallback((next: boolean) => {
    setAnnotatingMode(next);
    if (next) setSelectedIds(new Set());
  }, []);

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
    () => groupAnnotations(graphs, hands, allographs),
    [graphs, hands, allographs]
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

          {selectionEnabled && selectionCount > 0 && (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-muted-foreground">{selectionCount} selected</span>
              <Button
                size="sm"
                variant="default"
                onClick={() => addAllSelectedToCollection()}
                className="h-7 gap-1.5"
              >
                <Star className="h-3.5 w-3.5" />
                Add to collection
              </Button>
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

                        {/* Per-allograph toolbar: Select all / Unselect all / Add to collection.
                            Hidden in annotating mode (editor view, no collection workflow). */}
                        {selectionEnabled && (
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
                          </div>
                        )}
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
                            selectionEnabled={selectionEnabled}
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
