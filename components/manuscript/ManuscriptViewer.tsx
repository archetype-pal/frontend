'use client';

import * as React from 'react';
import {
  Home,
  LaptopMinimal,
  ZoomIn,
  ZoomOut,
  Hand,
  Pencil,
  Save,
  Trash2,
  Expand,
  SquarePen,
  X,
  Share2,
  Star,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import type { ViewerApi, Annotation as A9sAnnotation } from './ManuscriptAnnotorious';
import { getSelectorValue, iiifThumbFromSelector, getIiifBaseUrl } from '@/utils/iiif';
const ManuscriptAnnotorious = dynamic(() => import('./ManuscriptAnnotorious'), { ssr: false });

import { ManuscriptTabs } from './manuscript-tabs';
import { Toolbar } from './toolbar';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { AnnotationHeader } from '@/components/annotation/annotation-header';
import { OpenLightboxButton } from '@/components/lightbox/open-lightbox-button';
import {
  fetchManuscriptImage,
  fetchAllographs,
  fetchManuscript,
  fetchPositions,
} from '@/services/manuscripts';
import {
  fetchAnnotationsForImage,
  postAnnotation,
  patchAnnotation,
  type BackendGraph,
} from '@/services/annotations';
import {
  backendToA9sAnnotation,
  a9sToBackendFeature,
  isDbAnnotation,
  dbIdFromA9s,
} from '@/lib/annoMapping';

import type { ManuscriptImage as ManuscriptImageType } from '@/types/manuscript-image';
import type { Allograph } from '@/types/allographs';
import type { HandType } from '@/types/hands';
import type { Manuscript } from '@/types/manuscript';

import { useDraggablePosition } from '@/hooks/useDraggablePosition';

interface ManuscriptViewerProps {
  imageId: string;
  mode?: 'public' | 'editor';
}

// small helpers for cache meta
const metaKeyFor = (iiif: string) => `annotations:meta:${iiif}`;
const cacheKeyFor = (iiif: string) => `annotations:${iiif}`;
const isDbId = (id?: string) => typeof id === 'string' && id.startsWith('db:');

/** Rewrite cross-origin IIIF URL to same-origin /iiif-proxy to avoid CORS. Keeps path encoding (%2F) so Sipi receives a single identifier segment. */
function browserSafeIiifUrl(raw: string): string {
  const base = raw.replace(/\/info\.json$/, '');
  if (typeof window === 'undefined') return base;

  try {
    const u = new URL(raw);
    if (u.origin !== window.location.origin) {
      const path = u.pathname.replace(/\/info\.json$/i, '');
      return `${window.location.origin}/iiif-proxy${path}`;
    }
    return base;
  } catch {
    return base;
  }
}

export default function ManuscriptViewer({
  imageId,
  mode = 'public',
}: ManuscriptViewerProps): React.JSX.Element {
  const isPublicDemoMode = mode === 'public';

  // Always start with default value to avoid hydration mismatch
  const [annotationsEnabled, setAnnotationsEnabled] = React.useState<boolean>(true);

  // Load from localStorage only on client after mount
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = localStorage.getItem(`annotationsVisible:${imageId}`);
    if (saved !== null) {
      setAnnotationsEnabled(saved === 'true');
    }
  }, [imageId]);

  const [manuscriptImage, setManuscriptImage] = React.useState<ManuscriptImageType | null>(null);
  const [manuscript, setManuscript] = React.useState<Manuscript | null>(null);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string | null>(null);
  const [selectedAllograph, setSelectedAllograph] = React.useState<Allograph | undefined>(
    undefined
  );
  const [selectedHand, setSelectedHand] = React.useState<HandType | undefined>(undefined);
  const [allographs, setAllographs] = React.useState<Allograph[]>([]);
  const [imageAllographIds, setImageAllographIds] = React.useState<number[]>([]);

  const viewerApiRef = React.useRef<ViewerApi | null>(null);
  const [osdReady, setOsdReady] = React.useState(false);

  const [initialA9sAnnots, setInitialA9sAnnots] = React.useState<A9sAnnotation[]>([]);

  const [imageHeight, setImageHeight] = React.useState<number>(0);
  const [activeButton, setActiveButton] = React.useState<'move' | 'editorial' | 'delete'>('move');

  // track when OSD is in fullscreen
  const [isFullScreen, setIsFullScreen] = React.useState(false);

  const allographNameById = React.useMemo(
    () => new Map(allographs.map((a) => [a.id, a.name])),
    [allographs]
  );

  const [hoveredAllograph, setHoveredAllograph] = React.useState<Allograph | undefined>(undefined);

  const [isAllographModalOpen, setIsAllographModalOpen] = React.useState(false);
  const [hoveredAnnotationId, setHoveredAnnotationId] = React.useState<string | null>(null);
  const activeAllographLabel = hoveredAllograph?.name ?? selectedAllograph?.name ?? undefined;
  const activeHandLabel = selectedHand?.name ?? 'Any';
  const [selectedAnnotation, setSelectedAnnotation] = React.useState<A9sWithMeta | null>(null);
  const [popupTab, setPopupTab] = React.useState<'components' | 'positions' | 'notes'>(
    'components'
  );
  const [positions, setPositions] = React.useState<Array<{ id: number; name: string }>>([]);
  const [shareUrl, setShareUrl] = React.useState('');
  const [isShareUrlVisible, setIsShareUrlVisible] = React.useState(false);
  const initialGraphHandledRef = React.useRef(false);

  type A9sWithMeta = A9sAnnotation & {
    body?: Array<{ value?: string; type?: string; purpose?: string }>;
    _meta?: {
      allographId?: number;
      handId?: number;
      numFeatures?: number;
      isDescribed?: boolean;
      annotationType?: string;
      graphcomponentSet?: Array<{ component: number; features: number[] }>;
      positions?: number[];
    };
  };
  const [a9sSnapshot, setA9sSnapshot] = React.useState<A9sAnnotation[]>([]);

  const activeAllographId = hoveredAllograph?.id ?? selectedAllograph?.id ?? null;
  const selectedAllographTitle =
    selectedAnnotation?.body?.find((b) => b.purpose === 'commenting')?.value ??
    allographNameById.get(selectedAnnotation?._meta?.allographId ?? -1) ??
    'Annotation';

  const selectedPositions = React.useMemo(
    () => selectedAnnotation?._meta?.positions ?? [],
    [selectedAnnotation]
  );
  const hasPositionsTab = selectedPositions.length > 0;

  React.useEffect(() => {
    if (!hasPositionsTab && popupTab === 'positions') {
      setPopupTab('components');
    }
  }, [hasPositionsTab, popupTab]);

  const handleShareSelectedAnnotation = () => {
    if (!selectedAnnotation || typeof window === 'undefined') return;

    const graphId = selectedAnnotation.id.replace(/^db:/, '');
    if (!graphId) return;

    const url = new URL(window.location.href);
    url.searchParams.set('graph', graphId);

    setShareUrl(url.toString());
    setIsShareUrlVisible(true);
  };
  const handleCopyShareUrl = async () => {
    if (!shareUrl) return;

    try {
      await navigator.clipboard.writeText(shareUrl);
    } catch {
      // ignore for now
    }
  };

  const selectedAllographData = React.useMemo(() => {
    const allographId = selectedAnnotation?._meta?.allographId;
    if (allographId == null) return undefined;
    return allographs.find((a) => a.id === allographId);
  }, [allographs, selectedAnnotation]);

  const selectedComponentGroups = React.useMemo(() => {
    const graphComponents = selectedAnnotation?._meta?.graphcomponentSet ?? [];
    if (!graphComponents.length) return [];

    return graphComponents.map((gc) => {
      const allographComponent = selectedAllographData?.components.find(
        (component) => component.component_id === gc.component
      );

      const featureNames = gc.features
        .map((featureId) => {
          return allographComponent?.features.find((feature) => feature.id === featureId)?.name;
        })
        .filter((name): name is string => Boolean(name));

      return {
        componentId: gc.component,
        componentName: allographComponent?.component_name ?? `Component ${gc.component}`,
        featureNames,
      };
    });
  }, [selectedAnnotation, selectedAllographData]);

  const selectedNotes = React.useMemo(() => {
    return (selectedAnnotation?.body ?? [])
      .filter((body) => {
        const value = body.value?.trim() ?? '';
        return value.length > 0 && body.purpose !== 'commenting';
      })
      .map((body) => body.value!.trim());
  }, [selectedAnnotation]);

  const positionNameById = React.useMemo(
    () => new Map(positions.map((p) => [p.id, p.name])),
    [positions]
  );

  const selectedPositionLabels = React.useMemo(() => {
    return selectedPositions.map((positionId) => {
      return positionNameById.get(positionId) ?? `Position ${positionId}`;
    });
  }, [selectedPositions, positionNameById]);

  const handleCloseSelectedAnnotation = () => {
    viewerApiRef.current?.clearSelection?.();
    setSelectedAnnotation(null);
    setPopupTab('components');
    setIsShareUrlVisible(false);
    setShareUrl('');
    annotationPopupDrag.reset();
  };
  React.useEffect(() => {
    setIsShareUrlVisible(false);
    setShareUrl('');
  }, [selectedAnnotation?.id]);

  const allographDialogDrag = useDraggablePosition();
  const annotationPopupDrag = useDraggablePosition({ x: 0, y: 300 });

  const filteredA9s = React.useMemo(() => {
    if (activeAllographId == null) return [];
    return a9sSnapshot.filter((a) => (a as A9sWithMeta)._meta?.allographId === activeAllographId);
  }, [a9sSnapshot, activeAllographId]);

  const filteredIds = React.useMemo(() => filteredA9s.map((a) => a.id), [filteredA9s]);

  React.useEffect(() => {
    if (!osdReady) return;

    // If hovering a thumbnail, highlight ONLY that annotation
    if (hoveredAnnotationId) {
      viewerApiRef.current?.highlightAnnotations?.([hoveredAnnotationId]);
      return;
    }

    if (activeAllographId == null) {
      viewerApiRef.current?.clearHighlights?.();
      return;
    }

    viewerApiRef.current?.highlightAnnotations?.(filteredIds);
  }, [osdReady, hoveredAnnotationId, activeAllographId, filteredIds]);

  const handleToggleFullScreen = () => {
    setIsFullScreen((prev) => !prev);

    // OpenSeadragon recomputes its layout
    if (typeof window !== 'undefined') {
      setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
      }, 0);
    }
  };

  const handleExposeApi = React.useCallback((api: ViewerApi) => {
    viewerApiRef.current = api;
    setOsdReady(true);

    // Initial tool setup
    api.enablePan();
    setActiveButton('move');

    setA9sSnapshot(api.getAnnotations?.() ?? []);
  }, []);

  // persist the unsaved counter so it survives reloads
  // Always start with 0 to avoid hydration mismatch
  const [unsavedChanges, setUnsavedChanges] = React.useState<number>(0);

  // Load from localStorage only on client after mount
  React.useEffect(() => {
    if (typeof window === 'undefined' || isPublicDemoMode) return;
    try {
      const saved = Number(localStorage.getItem(`unsaved:${imageId}`) || 0);
      if (saved > 0) {
        setUnsavedChanges(saved);
      }
    } catch {
      // ignore
    }
  }, [imageId, isPublicDemoMode]);

  React.useEffect(() => {
    if (typeof window === 'undefined' || isPublicDemoMode) return;
    try {
      localStorage.setItem(`unsaved:${imageId}`, String(unsavedChanges));
    } catch {
      // ignore
    }
  }, [unsavedChanges, imageId, isPublicDemoMode]);

  React.useEffect(() => {
    if (!osdReady) return;
    viewerApiRef.current?.toggleAnnotations(annotationsEnabled);
  }, [annotationsEnabled, osdReady]);

  // load image & size
  React.useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      try {
        setLoading(true);
        const [image, allographsData, positionsData] = await Promise.all([
          fetchManuscriptImage(imageId),
          fetchAllographs(),
          fetchPositions(),
        ]);
        if (!isMounted) return;
        setManuscriptImage(image);
        setAllographs(allographsData);
        setPositions(positionsData);

        fetchManuscript(image.item_part).then((m) => {
          if (isMounted) setManuscript(m);
        });

        const baseUrl = browserSafeIiifUrl(getIiifBaseUrl(image.iiif_image));
        const infoUrl = `${baseUrl}/info.json`;
        try {
          const infoRes = await fetch(infoUrl);
          if (!infoRes.ok) throw new Error(`IIIF info: ${infoRes.status}`);
          const info = await infoRes.json();
          if (isMounted) setImageHeight(info.height ?? 2000);
        } catch {
          if (isMounted) setImageHeight(2000);
        }
        if (isMounted) setError(null);
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load manuscript data');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    void loadData();
    return () => {
      isMounted = false;
    };
  }, [imageId]);

  React.useEffect(() => {
    if (!manuscriptImage) return;
    let isMounted = true;
    const loadAllographIds = async () => {
      try {
        const graphs = await fetchAnnotationsForImage(String(manuscriptImage.id));
        if (!isMounted) return;
        const ids = Array.from(
          new Set(
            graphs.map((g) => g.allograph).filter((id): id is number => typeof id === 'number')
          )
        );
        setImageAllographIds(ids);
      } catch {
        if (isMounted) setImageAllographIds([]);
      }
    };
    void loadAllographIds();
    return () => {
      isMounted = false;
    };
  }, [manuscriptImage]);

  const allographsForThisImage = React.useMemo(() => {
    if (!allographs.length) return [];

    // If there are no graphs yet (new image), fall back to showing all allographs
    if (!imageAllographIds.length) return allographs;

    const idSet = new Set(imageAllographIds);
    return allographs.filter((a) => idSet.has(a.id));
  }, [allographs, imageAllographIds]);

  React.useEffect(() => {
    if (!manuscriptImage || !imageHeight) return;
    let isMounted = true;
    const load = async () => {
      try {
        const allographId = selectedAllograph?.id ? String(selectedAllograph.id) : undefined;
        const list = await fetchAnnotationsForImage(String(manuscriptImage.id), allographId);
        if (!isMounted) return;
        const dbMapped: A9sAnnotation[] = list.map((a) =>
          backendToA9sAnnotation(a, imageHeight, allographNameById.get(a.allograph))
        );
        const iiif = manuscriptImage.iiif_image;
        const cacheKey = cacheKeyFor(iiif);
        const metaKey = metaKeyFor(iiif);
        let merged: A9sAnnotation[] = dbMapped;
        if (typeof window !== 'undefined' && !isPublicDemoMode) {
          try {
            const raw = localStorage.getItem(cacheKey);
            const meta = JSON.parse(localStorage.getItem(metaKey) || '{}') as {
              imageHeight?: number;
            };
            if (raw && meta?.imageHeight === imageHeight) {
              const cached = JSON.parse(raw) as A9sAnnotation[];
              const localOnly = Array.isArray(cached) ? cached.filter((a) => !isDbId(a?.id)) : [];
              const existing = new Set(dbMapped.map((a) => a.id));
              const extras = localOnly.filter((a) => !existing.has(a.id));
              merged = [...dbMapped, ...extras];
            } else if (raw && meta?.imageHeight !== imageHeight) {
              localStorage.removeItem(cacheKey);
              localStorage.removeItem(metaKey);
            }
          } catch {
            // ignore
          }
        }
        if (isMounted) setInitialA9sAnnots(merged);
        if (isMounted) setA9sSnapshot(merged);
      } catch {
        if (isMounted) {
          setInitialA9sAnnots([]);
          setA9sSnapshot([]);
        }
      }
    };
    load();
    return () => {
      isMounted = false;
    };
  }, [manuscriptImage, imageHeight, selectedAllograph, allographNameById, isPublicDemoMode]);

  const handleMoveTool = () => {
    viewerApiRef.current?.enablePan();
    setActiveButton('move');
  };

  const handleCreateAnnotation = () => {
    viewerApiRef.current?.enableDraw();
    setActiveButton('editorial');
  };

  const handleDeleteTool = () => {
    viewerApiRef.current?.enableDelete();
    setActiveButton('delete');
  };

  // === SAVE ===
  const handleSave = React.useCallback(async (): Promise<void> => {
    if (isPublicDemoMode) return;
    try {
      const a9s = viewerApiRef.current?.getAnnotations() ?? [];
      const tasks: Promise<BackendGraph>[] = [];
      for (const a of a9s) {
        const feature = a9sToBackendFeature(a, imageHeight);
        if (isDbAnnotation(a)) {
          const id = dbIdFromA9s(a)!;
          tasks.push(patchAnnotation(id, { annotation: feature }));
        } else {
          tasks.push(
            postAnnotation({
              item_image: Number(manuscriptImage!.id),
              annotation: feature,
              allograph: selectedAllograph?.id ?? 0,
              hand: selectedHand?.id ?? 0,
              graphcomponent_set: [],
              positions: [],
            })
          );
        }
      }

      await Promise.all(tasks);
      setUnsavedChanges(0);
      if (typeof window !== 'undefined') {
        try {
          localStorage.removeItem(`unsaved:${imageId}`);
        } catch {
          // ignore
        }
      }

      // Reload DB → map → replace cache (drop local-only)
      const refreshed = await fetchAnnotationsForImage(
        String(manuscriptImage!.id),
        selectedAllograph?.id ? String(selectedAllograph.id) : undefined
      );
      const mapped = refreshed.map((a) => backendToA9sAnnotation(a, imageHeight));

      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(
            `annotations:${manuscriptImage!.iiif_image}`,
            JSON.stringify(mapped)
          );
          localStorage.setItem(
            `annotations:meta:${manuscriptImage!.iiif_image}`,
            JSON.stringify({ imageHeight })
          );
        } catch {
          // ignore
        }
      }

      setInitialA9sAnnots(mapped);
    } catch {
      // save failed — leave unsaved count as is
    }
  }, [manuscriptImage, imageHeight, selectedAllograph, selectedHand, imageId, isPublicDemoMode]);

  React.useEffect(() => {
    if (isPublicDemoMode) return;
    const handleKeyPress = (e: KeyboardEvent): void => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (unsavedChanges > 0) void handleSave();
      }
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [unsavedChanges, handleSave, isPublicDemoMode]);

  React.useEffect(() => {
    if (initialGraphHandledRef.current) return;
    if (!osdReady || !a9sSnapshot.length || typeof window === 'undefined') return;

    const url = new URL(window.location.href);
    const graphParam = url.searchParams.get('graph');

    if (!graphParam) {
      initialGraphHandledRef.current = true;
      return;
    }

    const targetId = `db:${graphParam}`;
    const found = a9sSnapshot.find((a) => a.id === targetId) as A9sWithMeta | undefined;

    initialGraphHandledRef.current = true;

    if (!found) return;

    setSelectedAnnotation(found);
    setPopupTab('components');

    viewerApiRef.current?.selectAnnotationById?.(targetId);
    viewerApiRef.current?.centerOnAnnotation?.(targetId);
  }, [osdReady, a9sSnapshot]);

  if (loading) return <div className="flex h-screen items-center justify-center">Loading...</div>;
  if (error || !manuscriptImage) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error || 'Failed to load manuscript image'}</p>
          <Button onClick={() => window.location.reload()}>Try Again</Button>
        </div>
      </div>
    );
  }

  const handleToggleAnnotations = () => {
    setAnnotationsEnabled((prev) => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(`annotationsVisible:${imageId}`, String(next));
        } catch {
          // ignore
        }
      }
      viewerApiRef.current?.toggleAnnotations(next);
      return next;
    });
  };

  return (
    <div
      className={
        isFullScreen ? 'fixed inset-0 z-50 flex flex-col bg-black' : 'flex h-screen flex-col'
      }
    >
      {!isFullScreen && (
        <>
          <header className="border-b bg-card px-4 py-2">
            <h1 className="text-lg font-semibold">
              Manuscript Image:{' '}
              <Link
                href={`/manuscripts/${manuscript?.id}`}
                className="text-blue-600 hover:underline"
              >
                {manuscript?.display_label}
              </Link>
              : {manuscriptImage.locus}
            </h1>
            <p className="text-sm text-muted-foreground line-clamp-3">
              {manuscript?.historical_item?.descriptions?.[0]?.content ||
                'No description available'}
            </p>
          </header>

          <ManuscriptTabs />
        </>
      )}

      {isFullScreen ? (
        <div className="fixed top-0 left-0 right-0 z-40 bg-card/95 backdrop-blur border-b">
          <AnnotationHeader
            annotationsEnabled={annotationsEnabled}
            onToggleAnnotations={handleToggleAnnotations}
            unsavedCount={unsavedChanges}
            showUnsavedCount={!isPublicDemoMode}
            imageId={imageId}
            onAllographSelect={setSelectedAllograph}
            onHandSelect={setSelectedHand}
            allographs={allographsForThisImage}
            onAllographHover={setHoveredAllograph}
            activeAllographCount={filteredA9s.length}
            activeAllographLabel={activeAllographLabel}
            onOpenAllographModal={() => {
              setHoveredAnnotationId(null);
              setIsAllographModalOpen(true);
            }}
          />
        </div>
      ) : (
        <AnnotationHeader
          annotationsEnabled={annotationsEnabled}
          onToggleAnnotations={handleToggleAnnotations}
          unsavedCount={unsavedChanges}
          showUnsavedCount={!isPublicDemoMode}
          imageId={imageId}
          onAllographSelect={setSelectedAllograph}
          onHandSelect={setSelectedHand}
          allographs={allographsForThisImage}
          onAllographHover={setHoveredAllograph}
          activeAllographCount={filteredA9s.length}
          activeAllographLabel={activeAllographLabel}
          onOpenAllographModal={() => {
            setHoveredAnnotationId(null);
            setIsAllographModalOpen(true);
          }}
        />
      )}
      <Dialog
        open={isAllographModalOpen}
        onOpenChange={(open) => {
          setIsAllographModalOpen(open);
          if (!open) allographDialogDrag.reset();
        }}
        modal={false}
      >
        <DialogContent
          className="w-[640px] max-w-[90vw] max-h-[80vh] overflow-auto"
          style={{
            transform: `translate(calc(-50% + ${allographDialogDrag.pos.x}px), calc(-50% + ${allographDialogDrag.pos.y}px))`,
          }}
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <DialogHeader className="cursor-move select-none" {...allographDialogDrag.bindDrag}>
            <DialogTitle className="mb-2">
              {activeAllographLabel ? `Allograph: ${activeAllographLabel}` : 'Allograph'}
            </DialogTitle>
          </DialogHeader>

          <div className="px-5 pb-4">
            <div className="text-sm text-muted-foreground">
              <span className="flex items-center gap-2">
                Hand:
                <span className="text-foreground font-medium">{activeHandLabel}</span>
                <span className="inline-flex items-center justify-center rounded bg-muted px-2 py-0.5 text-xs text-foreground">
                  {filteredA9s.length}
                </span>
              </span>
            </div>

            <Separator className="my-4" />

            <div className="grid grid-cols-4 gap-3">
              {filteredA9s.map((a) => {
                const v = getSelectorValue(a);
                if (!v || !manuscriptImage) return null;

                const base = browserSafeIiifUrl(getIiifBaseUrl(manuscriptImage.iiif_image));
                const src = iiifThumbFromSelector(base, v, 200);
                if (!src) return null;

                return (
                  <button
                    key={a.id}
                    className="group rounded-md border bg-background overflow-hidden text-left hover:shadow-sm"
                    onMouseEnter={() => setHoveredAnnotationId(a.id)}
                    onMouseLeave={() => setHoveredAnnotationId(null)}
                    onClick={() => {
                      viewerApiRef.current?.centerOnAnnotation?.(a.id);
                    }}
                    title={a.id}
                    type="button"
                  >
                    <div className="w-full aspect-square bg-muted flex items-center justify-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={src}
                        alt={`Annotation thumbnail: ${a.id}`}
                        className="max-h-full max-w-full object-contain"
                        loading="lazy"
                        onError={() => console.warn('thumb failed:', src)}
                      />
                    </div>
                    <div className="px-2 py-1 text-xs text-muted-foreground truncate">{a.id}</div>
                  </button>
                );
              })}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <div className={`relative flex flex-1 ${isFullScreen ? 'mt-20' : ''}`}>
        <Toolbar>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={() => viewerApiRef.current?.goHome()}>
                  <Home className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Reset View</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={isFullScreen ? 'default' : 'ghost'}
                  size="icon"
                  onClick={handleToggleFullScreen}
                >
                  {isFullScreen ? (
                    <Expand className="h-4 w-4" />
                  ) : (
                    <LaptopMinimal className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{isFullScreen ? 'Exit Full Screen' : 'Full Screen'}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={() => viewerApiRef.current?.zoomIn()}>
                  <ZoomIn className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Zoom In</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={() => viewerApiRef.current?.zoomOut()}>
                  <ZoomOut className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Zoom Out</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={activeButton === 'move' ? 'default' : 'ghost'}
                  size="icon"
                  onClick={handleMoveTool}
                >
                  <Hand className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Move Tool (m)</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={activeButton === 'editorial' ? 'default' : 'ghost'}
                  size="icon"
                  onClick={handleCreateAnnotation}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Create Annotation</TooltipContent>
            </Tooltip>
            {!isPublicDemoMode && (
              <>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => void handleSave()}
                      disabled={unsavedChanges === 0}
                    >
                      <Save className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Save</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={activeButton === 'delete' ? 'default' : 'ghost'}
                      size="icon"
                      onClick={handleDeleteTool}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Delete (del)</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <Expand className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Modify</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <SquarePen className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Draw</TooltipContent>
                </Tooltip>
              </>
            )}
            {manuscriptImage && manuscript && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <OpenLightboxButton
                      item={{
                        id: Number(imageId),
                        type: 'image',
                        image_iiif: manuscriptImage.iiif_image,
                        shelfmark: manuscript.current_item?.shelfmark || '',
                        locus: manuscriptImage.locus,
                        repository_name: manuscript.current_item?.repository?.name || '',
                        repository_city: manuscript.current_item?.repository?.place || '',
                        date: manuscript.historical_item?.date || '',
                      }}
                      variant="ghost"
                      size="icon"
                    />
                  </div>
                </TooltipTrigger>
                <TooltipContent>Open in Lightbox</TooltipContent>
              </Tooltip>
            )}
          </TooltipProvider>
        </Toolbar>

        <div className={isFullScreen ? 'flex-1 overflow-hidden p-0' : 'flex-1 overflow-hidden p-4'}>
          <div
            className={
              isFullScreen
                ? 'relative h-full w-full overflow-hidden rounded-lg border bg-accent/50'
                : 'relative h-[calc(100%-3rem)] w-full overflow-hidden rounded-lg border bg-accent/50 ml-10'
            }
          >
            <ManuscriptAnnotorious
              iiifImageUrl={browserSafeIiifUrl(getIiifBaseUrl(manuscriptImage.iiif_image))}
              initialAnnotations={initialA9sAnnots}
              disableEditor={true}
              readOnly={isPublicDemoMode}
              onCreate={() => {
                if (typeof window !== 'undefined' && !isPublicDemoMode) {
                  try {
                    const iiif = manuscriptImage.iiif_image;
                    const cacheKey = cacheKeyFor(iiif);
                    const metaKey = metaKeyFor(iiif);
                    const all = viewerApiRef.current?.getAnnotations() ?? [];
                    localStorage.setItem(cacheKey, JSON.stringify(all));
                    localStorage.setItem(metaKey, JSON.stringify({ imageHeight }));
                  } catch {
                    // ignore
                  }
                }
                // unsaved counter: +1 for creates
                if (!isPublicDemoMode) {
                  setUnsavedChanges((n) => n + 1);
                }
                setA9sSnapshot(viewerApiRef.current?.getAnnotations?.() ?? []);
              }}
              onDelete={(a: A9sAnnotation) => {
                if (typeof window !== 'undefined' && !isPublicDemoMode) {
                  try {
                    const iiif = manuscriptImage.iiif_image;
                    const cacheKey = cacheKeyFor(iiif);
                    const metaKey = metaKeyFor(iiif);
                    const all = viewerApiRef.current?.getAnnotations() ?? [];
                    localStorage.setItem(cacheKey, JSON.stringify(all));
                    localStorage.setItem(metaKey, JSON.stringify({ imageHeight }));
                  } catch {
                    // ignore
                  }
                }
                const id = a?.id as string | undefined;
                if (!isPublicDemoMode && id && !isDbId(id)) {
                  // deleting a brand-new unsaved annotation reduces the counter
                  setUnsavedChanges((n) => Math.max(0, n - 1));
                }
                setA9sSnapshot(viewerApiRef.current?.getAnnotations?.() ?? []);
              }}
              onSelect={(a) => {
                const selected = (a as A9sWithMeta | null) ?? null;
                setSelectedAnnotation(selected);
                setPopupTab('components');
                setIsShareUrlVisible(false);
                setShareUrl('');
              }}
              exposeApi={handleExposeApi}
            />
            {selectedAnnotation && (
              <div
                className="fixed top-4 right-4 z-50 w-[420px] max-w-[90vw] rounded-lg border bg-background shadow-lg"
                style={{
                  transform: `translate(${annotationPopupDrag.pos.x}px, ${annotationPopupDrag.pos.y}px)`,
                }}
              >
                <div
                  className="flex items-center justify-between border-b px-4 py-3 cursor-move select-none"
                  {...annotationPopupDrag.bindDrag}
                >
                  <div className="min-w-0">
                    <h3 className="truncate text-base font-semibold">{selectedAllographTitle}</h3>
                  </div>

                  <div
                    className="ml-4 flex items-center gap-1"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={handleShareSelectedAnnotation}
                            aria-label="Share URL"
                          >
                            <Share2 className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Share URL</TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            disabled
                            aria-label="Add to Collection"
                          >
                            <Star className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Add to Collection</TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={handleCloseSelectedAnnotation}
                            aria-label="Close annotation popup"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Close</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>

                {isShareUrlVisible && (
                  <div className="border-b px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Input readOnly value={shareUrl} className="flex-1 text-sm" />
                      <Button variant="ghost" size="sm" onClick={handleCopyShareUrl}>
                        Copy
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setIsShareUrlVisible(false)}
                        title="Hide URL"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}

                <Tabs
                  value={popupTab}
                  onValueChange={(value) =>
                    setPopupTab(value as 'components' | 'positions' | 'notes')
                  }
                  className="w-full"
                >
                  <div className="border-b px-4 py-2">
                    <TabsList className="h-auto gap-2 bg-transparent p-0">
                      <TabsTrigger
                        value="components"
                        className="h-8 rounded-md border border-transparent px-3 text-sm font-medium
                 data-[state=active]:border data-[state=active]:bg-background
                 data-[state=active]:shadow-sm"
                      >
                        Components
                      </TabsTrigger>

                      {hasPositionsTab && (
                        <TabsTrigger
                          value="positions"
                          className="h-8 rounded-md border border-transparent px-3 text-sm font-medium
                   data-[state=active]:border data-[state=active]:bg-background
                   data-[state=active]:shadow-sm"
                        >
                          Aspects
                        </TabsTrigger>
                      )}

                      <TabsTrigger
                        value="notes"
                        className="h-8 rounded-md border border-transparent px-3 text-sm font-medium
                 data-[state=active]:border data-[state=active]:bg-background
                 data-[state=active]:shadow-sm"
                      >
                        Notes
                      </TabsTrigger>
                    </TabsList>
                  </div>

                  <div className="max-h-[320px] overflow-auto px-4 py-4">
                    <TabsContent value="components" className="mt-0">
                      <div className="space-y-4">
                        {selectedComponentGroups.length > 0 ? (
                          selectedComponentGroups.map((group) => (
                            <div key={group.componentId}>
                              <div className="text-sm font-semibold text-foreground">
                                {group.componentName}
                              </div>
                              <Separator className="my-2" />
                              {group.featureNames.length > 0 ? (
                                <div className="space-y-1">
                                  {group.featureNames.map((featureName) => (
                                    <div
                                      key={`${group.componentId}-${featureName}`}
                                      className="text-sm text-muted-foreground"
                                    >
                                      {featureName}
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="text-sm text-muted-foreground">
                                  No features selected.
                                </div>
                              )}
                            </div>
                          ))
                        ) : (
                          <div className="text-sm text-muted-foreground">
                            No components defined.
                          </div>
                        )}
                      </div>
                    </TabsContent>

                    {hasPositionsTab && (
                      <TabsContent value="positions" className="mt-0">
                        <div className="space-y-2">
                          {selectedPositionLabels.map((label) => (
                            <div key={label} className="text-sm text-muted-foreground">
                              {label}
                            </div>
                          ))}
                        </div>
                      </TabsContent>
                    )}

                    <TabsContent value="notes" className="mt-0">
                      <div className="space-y-2">
                        {selectedNotes.length > 0 ? (
                          selectedNotes.map((note, index) => (
                            <div key={`${index}-${note}`} className="text-sm text-muted-foreground">
                              {note}
                            </div>
                          ))
                        ) : (
                          <div className="text-sm text-muted-foreground">No notes available.</div>
                        )}
                      </div>
                    </TabsContent>
                  </div>
                </Tabs>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
