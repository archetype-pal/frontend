'use client';

import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Image from 'next/image';
import Link from 'next/link';
import { getIiifImageUrl } from '@/utils/iiif';
import { useTabNavigation } from '@/hooks/use-tab-navigation';
import type {
  HandDetail,
  HandImage,
  HandScribe,
  HandManuscript,
  HandGraph,
} from '@/types/hand-detail';
import type { BackendGraph } from '@/services/annotations';
import type { AllographSummary } from '@/types/allographs';
import { fetchAllographSummaries } from '@/services/manuscripts';
import {
  BookOpen,
  Calendar,
  MapPin,
  PenTool,
  User,
  FileText,
  ImageIcon,
  Grid3X3,
  Loader2,
} from 'lucide-react';
import { apiFetch } from '@/lib/api-fetch';
import { sanitizeHtml } from '@/lib/sanitize-html';
import { formatAllographLabel } from '@/lib/allograph-labels';
import { graphToCollectionItem } from '@/lib/collection-item';
import { downloadCsv, graphsToCsv } from '@/lib/graph-csv';
import { openLightboxWithItems } from '@/lib/lightbox-utils';
import { useSelectionSet } from '@/hooks/use-selection-set';
import { useGraphCollection } from '@/hooks/manuscript/use-graph-collection';
import { useCollection } from '@/contexts/collection-context';
import { Button } from '@/components/ui/button';
import { TooltipProvider } from '@/components/ui/tooltip';
import { DensityControl, useThumbDensity } from '@/components/manuscript/thumb-density';
import { GallerySelectionBar } from '@/components/manuscript/annotation-gallery-selection-bar';
import {
  GalleryRowsProvider,
  HandSection,
  type GalleryRowsContextValue,
} from '@/components/manuscript/annotation-gallery-rows';
import {
  type AllographGroup,
  type HandGroup,
  handAccentColor,
} from '@/lib/annotation-gallery-groups';
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

// ── Client-side graph fetching ──────────────────────────────────────

function enrichGraphs(
  backendGraphs: BackendGraph[],
  allographs: AllographSummary[],
  images: HandImage[],
  hand: HandDetail,
  shelfmark: string,
  fallbackLabel: (allographId: number) => string
): HandGraph[] {
  // Same labels as the image Annotations tab, on the page and in what is collected or exported.
  // Real labels only: the fallback is for the page, so a collected graph or a CSV row is left
  // without an allograph rather than keeping the placeholder.
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
        allograph_name: allographLabelById.get(g.allograph) ?? fallbackLabel(g.allograph),
        allograph_id: g.allograph,
        image_iiif: iiifImage.endsWith('/info.json') ? iiifImage : `${iiifImage}/info.json`,
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
): { state: GraphsState; retry: () => void } {
  const t = useTranslations('hand.graphs');
  const [state, setState] = useState<GraphsState>({ status: 'loading' });
  const fetchedRef = useRef(false);

  // Never cancelled: the effect below loads once, so a cancelled request would not be retried.
  const load = useCallback(() => {
    Promise.all([
      apiFetch(`/api/v1/manuscripts/graphs/?hand=${hand.id}`).then((r) => {
        if (!r.ok) throw new Error('Failed to fetch graphs');
        return r.json();
      }),
      // Labels only: without them the graphs still show, under a fallback label.
      fetchAllographSummaries().catch(() => []),
    ])
      .then(([rawGraphs, allographs]) => {
        const graphsArr: BackendGraph[] = Array.isArray(rawGraphs)
          ? rawGraphs
          : (rawGraphs?.results ?? []);
        const graphs = enrichGraphs(graphsArr, allographs, images, hand, shelfmark, (id) =>
          t('allographFallback', { id })
        );
        setState({ status: 'loaded', graphs });
      })
      .catch(() => setState({ status: 'error' }));
  }, [hand, images, shelfmark, t]);

  useEffect(() => {
    if (!enabled || fetchedRef.current) return;
    fetchedRef.current = true;
    load();
  }, [enabled, load]);

  const retry = useCallback(() => {
    setState({ status: 'loading' });
    load();
  }, [load]);

  return { state, retry };
}

// ── Main component ──────────────────────────────────────────────────

export function HandViewer({ hand, images, scribe, manuscript }: HandViewerProps) {
  const t = useTranslations('hand');
  const tCommon = useTranslations('common');
  // `?? []`: an API that predates backend#184 still sends a single `description`.
  const descriptions = hand.descriptions ?? [];
  const { activeTab, handleTabChange } = useTabNavigation(TAB_VALUES, DEFAULT_TAB);
  const { config: siteFeatures, isSectionEnabled } = useSiteFeatures();
  const handsSearchEnabled =
    isSectionEnabled('search') && isSearchCategoryEnabled(siteFeatures, 'hands');

  const manuscriptLabel = manuscript?.display_label ?? manuscript?.current_item?.shelfmark ?? null;

  // Lazy-load graphs only when the Graphs tab is active
  const { state: graphsState, retry: retryGraphs } = useHandGraphs(
    hand,
    images,
    manuscriptLabel ?? '',
    activeTab === 'graphs'
  );
  const graphs = useMemo(
    () => (graphsState.status === 'loaded' ? graphsState.graphs : []),
    [graphsState]
  );

  const [density, changeDensity] = useThumbDensity();
  const selection = useSelectionSet<number>();
  const { isInCollection, isHydrated } = useCollection();
  const { addGraphs, toggleGraph } = useGraphCollection();
  const addSelectedToCollection = () => {
    addGraphs(graphs.filter((g) => selection.selected.has(g.id)).map((g) => g.collection_item));
    selection.clear();
  };
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
  const handGroup = useMemo<HandGroup>(() => {
    const groupMap = new Map<number, AllographGroup>();
    for (const g of graphs) {
      if (!groupMap.has(g.allograph_id)) {
        groupMap.set(g.allograph_id, {
          allographId: g.allograph_id,
          allographName: g.allograph_name,
          graphs: [],
        });
      }
      groupMap.get(g.allograph_id)!.graphs.push(g.graph);
    }
    return { handId: hand.id, handName: hand.name, allographs: Array.from(groupMap.values()) };
  }, [graphs, hand.id, hand.name]);

  const handGraphById = useMemo(() => new Map(graphs.map((g) => [g.id, g])), [graphs]);
  const rows: GalleryRowsContextValue = {
    density,
    iiifImage: (g) => handGraphById.get(g.id)?.image_iiif ?? '',
    viewerHref: (g) => {
      const handGraph = handGraphById.get(g.id);
      return handGraph ? `/manuscripts/${handGraph.item_part}/images/${handGraph.item_image}` : '';
    },
    canEdit: false,
    annotatingMode: false,
    selection,
    onEditGraph: () => {},
    onDeleteGraph: () => {},
    collection: {
      ready: isHydrated,
      has: (graphId) => isInCollection(graphId, 'graph'),
      toggle: (g) => {
        const handGraph = handGraphById.get(g.id);
        if (handGraph) toggleGraph(handGraph.collection_item);
      },
    },
  };

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
          <div className="rounded-lg border bg-card p-6 space-y-6">
            {descriptions.length > 0 ? (
              descriptions.map((d, i) => (
                <div key={d.id} className={i > 0 ? 'pt-6 border-t' : undefined}>
                  {d.source_label && (
                    <p className="text-xs font-medium text-muted-foreground mb-2">
                      {t('sourceLabel', { label: d.source_label })}
                    </p>
                  )}
                  <div
                    className="publication-body"
                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(d.content) }}
                  />
                </div>
              ))
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
                <span>{t('emptyStates.images')}</span>
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
                <Button size="sm" variant="outline" className="ml-auto" onClick={retryGraphs}>
                  {tCommon('tryAgain')}
                </Button>
              </div>
            </div>
          ) : graphs.length > 0 ? (
            <div className="space-y-6">
              <div className="flex justify-end">
                <DensityControl density={density} onChange={changeDensity} />
              </div>

              <TooltipProvider delayDuration={200}>
                <GalleryRowsProvider value={rows}>
                  <HandSection handGroup={handGroup} accent={handAccentColor(hand.id, 0)} />
                </GalleryRowsProvider>
              </TooltipProvider>

              <GallerySelectionBar
                shownCount={selection.selected.size}
                onAddToCollection={addSelectedToCollection}
                onSendToLightbox={sendSelectionToLightbox}
                onExport={exportSelected}
                onClear={selection.clear}
              />
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
