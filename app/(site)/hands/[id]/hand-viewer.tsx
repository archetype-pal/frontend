'use client';

import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Image from 'next/image';
import Link from 'next/link';
import { getIiifImageUrl } from '@/utils/iiif';
import { useIiifThumbnailUrl } from '@/hooks/use-iiif-thumbnail';
import { useTabNavigation } from '@/hooks/use-tab-navigation';
import type {
  HandDetail,
  HandImage,
  HandScribe,
  HandManuscript,
  HandGraph,
} from '@/types/hand-detail';
import type { BackendGraph } from '@/services/annotations';
import type { Allograph } from '@/types/allographs';
import {
  BookOpen,
  Calendar,
  Download,
  MapPin,
  PenTool,
  User,
  FileText,
  ImageIcon,
  Images,
  Grid3X3,
  ListChecks,
  Loader2,
  Square,
  Star,
} from 'lucide-react';
import { apiFetch } from '@/lib/api-fetch';
import { sanitizeHtml } from '@/lib/sanitize-html';
import { cn } from '@/lib/utils';
import { formatAllographLabel } from '@/lib/allograph-labels';
import { graphToCollectionItem } from '@/lib/collection-item';
import { getGraphDetailUrl } from '@/lib/media-url';
import { downloadCsv, graphsToCsv } from '@/lib/graph-csv';
import { openLightboxWithItems } from '@/lib/lightbox-utils';
import { useRangeSelect, useSelectionSet } from '@/hooks/use-selection-set';
import { useCollection } from '@/contexts/collection-context';
import { Button } from '@/components/ui/button';
import {
  DENSITY_THUMB_PX,
  DENSITY_WIDTH,
  DensityControl,
  useThumbDensity,
  type ThumbDensity,
} from '@/components/manuscript/thumb-density';
import { BackofficeLink } from '@/components/common/backoffice-link';
import { useSiteFeatures } from '@/contexts/site-features-context';
import { isSearchCategoryEnabled } from '@/lib/site-features';

const TAB_VALUES = ['information', 'description', 'images', 'graphs'] as const;
const DEFAULT_TAB = 'information';

interface HandViewerProps {
  hand: HandDetail;
  images: HandImage[];
  scribe: HandScribe | null;
  manuscript: HandManuscript | null;
}

/** A single graph thumbnail that resolves its IIIF crop URL and opens the graph on its image. */
function GraphThumbnail({
  graph,
  density,
  isSelected,
  onToggleSelect,
}: {
  graph: HandGraph;
  density: ThumbDensity;
  isSelected: boolean;
  onToggleSelect: (shiftKey: boolean) => void;
}) {
  const t = useTranslations('hand.graphs');
  const imageUrl = useIiifThumbnailUrl(
    graph.image_iiif,
    graph.coordinates,
    DENSITY_THUMB_PX[density]
  );

  return (
    <div className="relative group/thumb">
      <Link
        href={getGraphDetailUrl(graph) ?? '#'}
        aria-label={t('openGraph', { allograph: graph.allograph_name, id: graph.id })}
        className={cn(
          'relative block aspect-square border rounded bg-white overflow-hidden',
          DENSITY_WIDTH[density],
          isSelected && 'ring-2 ring-primary ring-offset-2'
        )}
      >
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={graph.allograph_name}
            fill
            className="object-contain transition-transform duration-200 group-hover/thumb:scale-110"
            sizes="14rem"
            unoptimized
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground/40">
            <ImageIcon className="h-5 w-5" />
          </div>
        )}
      </Link>
      <button
        type="button"
        onClick={(e) => onToggleSelect(e.shiftKey)}
        aria-pressed={isSelected}
        aria-label={isSelected ? t('unselectGraph') : t('selectGraph')}
        className={cn(
          'absolute left-1.5 top-1.5 z-10 flex h-6 w-6 items-center justify-center rounded-md border text-xs shadow-sm transition',
          isSelected
            ? 'border-primary bg-primary text-primary-foreground'
            : 'border-foreground/30 bg-background/95 text-transparent hover:border-primary hover:text-primary group-hover/thumb:text-muted-foreground'
        )}
      >
        ✓
      </button>
    </div>
  );
}

// ── Client-side graph fetching ──────────────────────────────────────

function enrichGraphs(
  backendGraphs: BackendGraph[],
  allographs: Allograph[],
  images: HandImage[],
  hand: HandDetail,
  shelfmark: string
): HandGraph[] {
  // Same labels as the image Annotations tab, on the page and in what is collected or exported.
  const allographLabelById = new Map(allographs.map((a) => [a.id, formatAllographLabel(a)]));
  const imageMap = new Map(images.map((img) => [img.id, img]));
  const collectionLabels = {
    allographLabelById,
    handNameById: new Map([[hand.id, hand.name]]),
  };

  return backendGraphs
    .map((g) => {
      const image = imageMap.get(g.item_image);
      const iiifImage = image?.iiif_image;
      if (!image || !iiifImage || typeof g.allograph !== 'number') return null;

      return {
        id: g.id,
        allograph_name: allographLabelById.get(g.allograph) ?? `Allograph ${g.allograph}`,
        allograph_id: g.allograph,
        image_iiif: iiifImage.endsWith('/info.json') ? iiifImage : `${iiifImage}/info.json`,
        coordinates: JSON.stringify(g.annotation),
        item_part: image.item_part,
        item_image: image.id,
        collection_item: graphToCollectionItem(
          g,
          {
            itemPartId: image.item_part,
            itemImageId: image.id,
            iiifImage,
            locus: image.locus ?? '',
            shelfmark,
          },
          collectionLabels
        ),
        graph: g,
      };
    })
    .filter((g): g is HandGraph => g !== null);
}

type GraphsState =
  { status: 'loading' } | { status: 'loaded'; graphs: HandGraph[] } | { status: 'error' };

function useHandGraphs(
  hand: HandDetail,
  images: HandImage[],
  shelfmark: string,
  enabled: boolean
): GraphsState {
  const [state, setState] = useState<GraphsState>({ status: 'loading' });
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (!enabled || fetchedRef.current) return;
    fetchedRef.current = true;

    // Never cancelled: this runs once, so a cancelled request would not be retried.
    Promise.all([
      apiFetch(`/api/v1/manuscripts/graphs/?hand=${hand.id}`).then((r) => (r.ok ? r.json() : [])),
      apiFetch(`/api/v1/symbols_structure/allographs/`).then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([rawGraphs, allographs]) => {
        const graphsArr: BackendGraph[] = Array.isArray(rawGraphs)
          ? rawGraphs
          : (rawGraphs?.results ?? []);
        const graphs = enrichGraphs(graphsArr, allographs, images, hand, shelfmark);
        setState({ status: 'loaded', graphs });
      })
      .catch(() => setState({ status: 'error' }));
  }, [enabled, hand, images, shelfmark]);

  return state;
}

// ── Main component ──────────────────────────────────────────────────

export function HandViewer({ hand, images, scribe, manuscript }: HandViewerProps) {
  const t = useTranslations('hand');
  const { activeTab, handleTabChange } = useTabNavigation(TAB_VALUES, DEFAULT_TAB);
  const { config: siteFeatures, isSectionEnabled } = useSiteFeatures();
  const handsSearchEnabled =
    isSectionEnabled('search') && isSearchCategoryEnabled(siteFeatures, 'hands');

  const manuscriptLabel =
    manuscript?.display_label ?? manuscript?.current_item?.shelfmark ?? (hand.shelfmark || null);

  // Lazy-load graphs only when the Graphs tab is active
  const graphsState = useHandGraphs(hand, images, manuscriptLabel ?? '', activeTab === 'graphs');
  const graphs = useMemo(
    () => (graphsState.status === 'loaded' ? graphsState.graphs : []),
    [graphsState]
  );

  const [density, changeDensity] = useThumbDensity();
  const selection = useSelectionSet<number>();
  const selectGraph = useRangeSelect(selection);
  const nothingSelected = selection.selected.size === 0;
  const { addItem, isInCollection } = useCollection();
  const addSelectedToCollection = useCallback(
    (candidates: HandGraph[]) => {
      for (const g of candidates) {
        if (!selection.selected.has(g.id) || isInCollection(g.id, 'graph')) continue;
        addItem(g.collection_item);
      }
    },
    [addItem, isInCollection, selection.selected]
  );
  const exportSelected = useCallback(() => {
    const locusByImage = new Map(images.map((img) => [img.id, img.locus ?? '']));
    const rows = graphs
      .filter((g) => selection.selected.has(g.id))
      .map((g) => ({
        graph: g.graph,
        allograph: g.collection_item.allograph ?? '',
        hand: hand.name,
        image: String(g.item_image),
        locus: locusByImage.get(g.item_image) ?? '',
      }));
    const csv = graphsToCsv(rows, [
      { header: 'image', value: (r) => r.image },
      { header: 'locus', value: (r) => r.locus },
    ]);
    downloadCsv(`hand-${hand.id}-graphs.csv`, csv);
  }, [graphs, hand, images, selection.selected]);
  const sendSelectionToLightbox = useCallback(() => {
    const ids = Array.from(selection.selected);
    if (ids.length === 0) return;
    openLightboxWithItems(ids.map((id) => ({ id, type: 'graph' as const })));
  }, [selection.selected]);

  // Group graphs by allograph, preserving order of first appearance
  const graphGroups = useMemo(() => {
    const groupMap = new Map<
      string,
      { allograph_id: number; allograph_name: string; graphs: HandGraph[] }
    >();
    for (const g of graphs) {
      const key = `${g.allograph_id}-${g.allograph_name}`;
      if (!groupMap.has(key)) {
        groupMap.set(key, {
          allograph_id: g.allograph_id,
          allograph_name: g.allograph_name,
          graphs: [],
        });
      }
      groupMap.get(key)!.graphs.push(g);
    }
    return Array.from(groupMap.values());
  }, [graphs]);

  const scrollToAllograph = useCallback((allographId: number, allographName: string) => {
    const key = `${allographId}-${allographName}`;
    const el = document.getElementById(`allograph-${key}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  return (
    <main className="container mx-auto p-4 max-w-6xl">
      {/* Header */}
      <div className="mb-6">
        <p className="text-sm text-muted-foreground mb-1">
          {handsSearchEnabled ? (
            <Link href="/search/hands" className="hover:underline">
              {t('breadcrumb')}
            </Link>
          ) : (
            t('breadcrumb')
          )}
          {manuscriptLabel && (
            <>
              {' / '}
              {hand.item_part ? (
                <Link href={`/manuscripts/${hand.item_part}`} className="hover:underline">
                  {manuscriptLabel}
                </Link>
              ) : (
                manuscriptLabel
              )}
            </>
          )}
        </p>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-3xl font-medium text-foreground">
            <span className="text-muted-foreground font-normal">{t('namePrefix')}</span>
            {hand.name}
          </h1>
          <BackofficeLink kind="hand" id={hand.id} />
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <TabsList className="bg-secondary p-1">
          <TabsTrigger value="information">{t('tabs.information')}</TabsTrigger>
          <TabsTrigger value="description">{t('tabs.description')}</TabsTrigger>
          <TabsTrigger value="images">
            {t('tabs.images')} ({images.length})
          </TabsTrigger>
          <TabsTrigger value="graphs">
            {t('tabs.graphs')}
            {graphsState.status === 'loaded' ? ` (${graphs.length})` : ''}
          </TabsTrigger>
        </TabsList>

        {/* Information Tab */}
        <TabsContent value="information" className="space-y-6">
          <div className="rounded-lg border bg-card p-6">
            <h2 className="text-lg font-semibold mb-4">{t('details.heading')}</h2>
            <dl className="grid grid-cols-[180px_1fr] gap-x-4 gap-y-3">
              <dt className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <PenTool className="h-4 w-4" />
                {t('fields.name')}
              </dt>
              <dd className="text-sm">{hand.name}</dd>

              {manuscriptLabel && (
                <>
                  <dt className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <BookOpen className="h-4 w-4" />
                    {t('fields.manuscript')}
                  </dt>
                  <dd className="text-sm">
                    {hand.item_part ? (
                      <Link
                        href={`/manuscripts/${hand.item_part}`}
                        className="text-primary hover:underline"
                      >
                        {manuscriptLabel}
                      </Link>
                    ) : (
                      manuscriptLabel
                    )}
                  </dd>
                </>
              )}

              {hand.script && (
                <>
                  <dt className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    {t('fields.script')}
                  </dt>
                  <dd className="text-sm">{hand.script}</dd>
                </>
              )}

              {scribe && (
                <>
                  <dt className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <User className="h-4 w-4" />
                    {t('fields.scribe')}
                  </dt>
                  <dd className="text-sm">
                    <Link href={`/scribes/${scribe.id}`} className="text-primary hover:underline">
                      {scribe.name}
                      {scribe.period && (
                        <span className="text-muted-foreground">
                          {'. '}
                          {scribe.period}
                        </span>
                      )}
                    </Link>
                  </dd>
                </>
              )}

              {hand.date && (
                <>
                  <dt className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {t('fields.date')}
                  </dt>
                  <dd className="text-sm">{hand.date}</dd>
                </>
              )}

              {hand.place && (
                <>
                  <dt className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    {t('fields.place')}
                  </dt>
                  <dd className="text-sm">{hand.place}</dd>
                </>
              )}
            </dl>
          </div>
        </TabsContent>

        {/* Description Tab */}
        <TabsContent value="description">
          <div className="rounded-lg border bg-card p-6">
            {hand.description ? (
              <div
                className="prose max-w-none"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(hand.description) }}
              />
            ) : (
              <div className="flex items-center gap-2 text-muted-foreground bg-muted/50 rounded-md p-4">
                <FileText className="h-4 w-4" />
                <span>{t('emptyStates.description')}</span>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Manuscript Images Tab */}
        <TabsContent value="images" className="space-y-6">
          {images.length > 0 ? (
            <section className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {images.map((image) => (
                <Link
                  key={image.id}
                  href={`/manuscripts/${image.item_part}/images/${image.id}`}
                  className="group"
                >
                  <div className="relative bg-card border rounded-lg p-4 transition-shadow hover:shadow-md">
                    <div className="relative aspect-square bg-muted/30 rounded overflow-hidden">
                      {image.iiif_image ? (
                        <Image
                          src={getIiifImageUrl(image.iiif_image, { thumbnail: true })}
                          alt={image.locus || t('imageAltFallback')}
                          fill
                          className="object-contain group-hover:scale-105 transition-transform duration-200"
                          unoptimized
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <ImageIcon className="h-12 w-12 text-muted-foreground/30" />
                        </div>
                      )}
                    </div>
                    <div className="mt-3 text-center">
                      <p className="text-sm font-medium">{image.locus}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {t('annotationCount', { count: image.number_of_annotations })}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </section>
          ) : (
            <div className="rounded-lg border bg-card p-6">
              <div className="flex items-center gap-2 text-muted-foreground bg-muted/50 rounded-md p-4">
                <ImageIcon className="h-4 w-4" />
                <span>No manuscript images associated to this hand.</span>
              </div>
            </div>
          )}
        </TabsContent>

        {/* Graphs Tab */}
        <TabsContent value="graphs" className="space-y-6">
          {graphsState.status === 'loading' ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">{t('graphs.loading')}</span>
            </div>
          ) : graphsState.status === 'error' ? (
            <div className="rounded-lg border bg-card p-6">
              <div className="flex items-center gap-2 text-destructive bg-destructive/10 rounded-md p-4">
                <Grid3X3 className="h-4 w-4" />
                <span>{t('graphs.loadError')}</span>
              </div>
            </div>
          ) : graphs.length > 0 ? (
            <div className="space-y-6">
              {/* Hand name heading */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-xl font-semibold">{hand.name}</h2>
                <DensityControl density={density} onChange={changeDensity} />
              </div>

              {/* Always rendered, so the first selection does not push the grid down. */}
              <div className="sticky top-[var(--site-header-h,0px)] z-30 flex flex-wrap items-center gap-2 rounded-md border bg-card/95 px-4 py-3 text-sm shadow-sm backdrop-blur">
                <span className="rounded-full bg-primary/10 px-2.5 py-1 font-medium text-primary">
                  {t('graphs.selectedCount', { count: selection.selected.size })}
                </span>
                <Button
                  size="sm"
                  className="gap-1.5"
                  disabled={nothingSelected}
                  onClick={() => addSelectedToCollection(graphs)}
                >
                  <Star className="h-4 w-4" />
                  {t('graphs.addToCollection')}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                  disabled={nothingSelected}
                  onClick={sendSelectionToLightbox}
                >
                  <Images className="h-4 w-4" />
                  {t('graphs.lightbox')}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                  disabled={nothingSelected}
                  onClick={exportSelected}
                >
                  <Download className="h-4 w-4" />
                  {t('graphs.exportCsv')}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={nothingSelected}
                  onClick={selection.clear}
                >
                  {t('graphs.clearSelection')}
                </Button>
              </div>

              {/* Allographs List navigation */}
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">
                  {t('graphs.allographsList')}
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {graphGroups.map((group) => (
                    <button
                      key={`${group.allograph_id}-${group.allograph_name}`}
                      onClick={() => scrollToAllograph(group.allograph_id, group.allograph_name)}
                      className="px-2.5 py-1 text-xs font-medium rounded border bg-primary/10 text-primary hover:bg-primary/20 transition-colors cursor-pointer"
                    >
                      {group.allograph_name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Allograph sections */}
              <div className="space-y-8">
                {graphGroups.map((group) => {
                  const key = `${group.allograph_id}-${group.allograph_name}`;
                  const groupIds = group.graphs.map((g) => g.id);
                  const groupSelectedCount = groupIds.filter((id) =>
                    selection.selected.has(id)
                  ).length;
                  const allSelected =
                    groupSelectedCount > 0 && groupSelectedCount === groupIds.length;
                  return (
                    <section key={key} id={`allograph-${key}`} className="scroll-mt-4">
                      <div className="border-b pb-2 mb-4 flex flex-wrap items-center gap-3">
                        <h4 className="text-base font-semibold">{group.allograph_name}</h4>
                        <div className="flex items-center gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 gap-1.5"
                            onClick={() =>
                              allSelected
                                ? selection.removeMany(groupIds)
                                : selection.addMany(groupIds)
                            }
                          >
                            {allSelected ? (
                              <>
                                <Square className="h-3.5 w-3.5" />
                                {t('graphs.unselectAll')}
                              </>
                            ) : (
                              <>
                                <ListChecks className="h-3.5 w-3.5" />
                                {t('graphs.selectAll')}
                              </>
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 gap-1.5"
                            disabled={groupSelectedCount === 0}
                            onClick={() => addSelectedToCollection(group.graphs)}
                          >
                            <Star className="h-3.5 w-3.5" />
                            {t('graphs.addSelected')}
                          </Button>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-3">
                        {group.graphs.map((graph) => (
                          <GraphThumbnail
                            key={graph.id}
                            graph={graph}
                            density={density}
                            isSelected={selection.selected.has(graph.id)}
                            onToggleSelect={(shiftKey) => selectGraph(groupIds, graph.id, shiftKey)}
                          />
                        ))}
                      </div>
                    </section>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="rounded-lg border bg-card p-6">
              <div className="flex items-center gap-2 text-muted-foreground bg-muted/50 rounded-md p-4">
                <Grid3X3 className="h-4 w-4" />
                <span>{t('graphs.empty')}</span>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </main>
  );
}
