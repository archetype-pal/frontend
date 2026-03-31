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
} from 'lucide-react';
import dynamic from 'next/dynamic';
import Link from 'next/link';

import { getSelectorValue, iiifThumbFromSelector, getIiifBaseUrl } from '@/utils/iiif';
import { ManuscriptTabs } from './manuscript-tabs';
import { Toolbar } from './toolbar';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { AnnotationHeader } from '@/components/annotation/annotation-header';
import { AnnotationPopupCard } from '@/components/annotation/annotation-popup-card';
import { OpenLightboxButton } from '@/components/lightbox/open-lightbox-button';
import {
  fetchManuscriptImage,
  fetchAllographs,
  fetchManuscript,
  fetchHands,
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

import type { ViewerApi, Annotation as A9sAnnotation } from './ManuscriptAnnotorious';
import type { ManuscriptImage as ManuscriptImageType } from '@/types/manuscript-image';
import type { Allograph } from '@/types/allographs';
import type { HandType } from '@/types/hands';
import type { Manuscript } from '@/types/manuscript';

import { useDraggablePosition } from '@/hooks/useDraggablePosition';

const ManuscriptAnnotorious = dynamic(() => import('./ManuscriptAnnotorious'), { ssr: false });

interface ManuscriptViewerProps {
  imageId: string;
  mode?: 'public' | 'editor';
}

type A9sFeatureDetail = {
  id: number;
  name: string;
};

type A9sGraphComponent = {
  component: number;
  componentName?: string;
  features: number[];
  featureDetails?: A9sFeatureDetail[];
};

type A9sPositionDetail = {
  id: number;
  name: string;
};

type A9sWithMeta = A9sAnnotation & {
  body?: Array<{ value?: string; type?: string; purpose?: string }>;
  _meta?: {
    allographId?: number;
    handId?: number;
    numFeatures?: number;
    isDescribed?: boolean;
    annotationType?: string;
    graphcomponentSet?: A9sGraphComponent[];
    positionDetails?: A9sPositionDetail[];
  };
};

type DraftSharePayload = {
  id: string;
  target: A9sAnnotation['target'];
  body?: A9sAnnotation['body'];
  _meta?: A9sWithMeta['_meta'];
};

type AnnotationVisibilityFilters = {
  allographIds: number[];
  handIds: number[];
  showEditorial: boolean;
  showPublicAnnotations: boolean;
};

type ToolbarPosition = 'vertical' | 'horizontal';

type AnnotationViewerSettings = {
  allowMultipleBoxes: boolean;
  selectMultipleAnnotations: boolean;
  toolbarPosition: ToolbarPosition;
};

const metaKeyFor = (iiif: string) => `annotations:meta:${iiif}`;
const cacheKeyFor = (iiif: string) => `annotations:${iiif}`;
const isDbId = (id?: string) => typeof id === 'string' && id.startsWith('db:');

function toggleNumericId(list: number[], id: number): number[] {
  return list.includes(id) ? list.filter((value) => value !== id) : [...list, id];
}

function includesAllIds(available: number[], selected: number[]): boolean {
  if (!available.length) return true;
  const selectedSet = new Set(selected);
  return available.every((id) => selectedSet.has(id));
}

function toBase64Url(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });

  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(value: string): string {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (ch) => ch.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function encodeDraftSharePayload(payload: DraftSharePayload): string {
  return toBase64Url(JSON.stringify(payload));
}

function decodeDraftSharePayload(value: string): DraftSharePayload | null {
  try {
    return JSON.parse(fromBase64Url(value)) as DraftSharePayload;
  } catch {
    return null;
  }
}

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

  // ---- State / refs ----
  const [annotationsEnabled, setAnnotationsEnabled] = React.useState<boolean>(true);

  const [manuscriptImage, setManuscriptImage] = React.useState<ManuscriptImageType | null>(null);
  const [manuscript, setManuscript] = React.useState<Manuscript | null>(null);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string | null>(null);

  const [filteredAllograph, setFilteredAllograph] = React.useState<Allograph | undefined>(
    undefined
  );
  const [selectedHand, setSelectedHand] = React.useState<HandType | undefined>(undefined);
  const [allographs, setAllographs] = React.useState<Allograph[]>([]);
  const [imageAllographIds, setImageAllographIds] = React.useState<number[]>([]);

  const [hands, setHands] = React.useState<HandType[]>([]);
  const [handsLoaded, setHandsLoaded] = React.useState(false);

  const [isFilterPanelOpen, setIsFilterPanelOpen] = React.useState(false);
  const [visibilityFilters, setVisibilityFilters] = React.useState<AnnotationVisibilityFilters>({
    allographIds: [],
    handIds: [],
    showEditorial: true,
    showPublicAnnotations: true,
  });

  const [allographFiltersInitialized, setAllographFiltersInitialized] = React.useState(false);
  const [handFiltersInitialized, setHandFiltersInitialized] = React.useState(false);

  const viewerApiRef = React.useRef<ViewerApi | null>(null);
  const [osdReady, setOsdReady] = React.useState(false);

  const [initialA9sAnnots, setInitialA9sAnnots] = React.useState<A9sAnnotation[]>([]);
  const [a9sSnapshot, setA9sSnapshot] = React.useState<A9sAnnotation[]>([]);

  const [imageHeight, setImageHeight] = React.useState<number>(0);
  const [activeButton, setActiveButton] = React.useState<'move' | 'editorial' | 'delete'>('move');
  const [isFullScreen, setIsFullScreen] = React.useState(false);

  const [hoveredAllograph, setHoveredAllograph] = React.useState<Allograph | undefined>(undefined);
  const [isAllographModalOpen, setIsAllographModalOpen] = React.useState(false);
  const [hoveredAnnotationId, setHoveredAnnotationId] = React.useState<string | null>(null);
  const [selectedAnnotation, setSelectedAnnotation] = React.useState<A9sWithMeta | null>(null);
  const [popupTab, setPopupTab] = React.useState<'components' | 'positions' | 'notes'>(
    'components'
  );
  const [shareUrl, setShareUrl] = React.useState('');
  const [isShareUrlVisible, setIsShareUrlVisible] = React.useState(false);
  const initialGraphHandledRef = React.useRef(false);

  const [unsavedChanges, setUnsavedChanges] = React.useState<number>(0);

  const [draftAllographText, setDraftAllographText] = React.useState('');
  const [draftNoteText, setDraftNoteText] = React.useState('');

  const [isSettingsPanelOpen, setIsSettingsPanelOpen] = React.useState(false);
  const [viewerSettings, setViewerSettings] = React.useState<AnnotationViewerSettings>({
    allowMultipleBoxes: false,
    selectMultipleAnnotations: false,
    toolbarPosition: 'vertical',
  });

  // ---- Drag hooks ----
  const allographDialogDrag = useDraggablePosition({ x: 300, y: 60 });
  const annotationPopupDrag = useDraggablePosition({ x: 0, y: 300 });
  const filterPanelDrag = useDraggablePosition({ x: 0, y: 180 });
  const settingsPanelDrag = useDraggablePosition({ x: 0, y: 0 });

  // ---- Derived values ----
  const allographNameById = React.useMemo(
    () => new Map(allographs.map((a) => [a.id, a.name])),
    [allographs]
  );

  const annotationSelectedAllograph = React.useMemo(() => {
    const allographId = selectedAnnotation?._meta?.allographId;
    if (allographId == null) return undefined;
    return allographs.find((a) => a.id === allographId);
  }, [allographs, selectedAnnotation]);

  const isDraftAnnotation = Boolean(selectedAnnotation && !isDbId(selectedAnnotation.id));

  const activeHandLabel = selectedHand?.name ?? 'Any';

  const dropdownAllograph = filteredAllograph ?? annotationSelectedAllograph ?? undefined;

  const displayAllograph =
    hoveredAllograph ?? filteredAllograph ?? annotationSelectedAllograph ?? undefined;

  const activeAllographLabel = displayAllograph?.name ?? undefined;

  const countAllographId = displayAllograph?.id ?? null;

  const highlightAllographId =
    hoveredAllograph?.id ??
    filteredAllograph?.id ??
    (isAllographModalOpen ? (annotationSelectedAllograph?.id ?? null) : null);

  const selectedAllographTitle =
    selectedAnnotation?.body?.find((b) => b.purpose === 'commenting')?.value ??
    allographNameById.get(selectedAnnotation?._meta?.allographId ?? -1) ??
    'Annotation';

  const selectedPositions = React.useMemo(
    () => selectedAnnotation?._meta?.positionDetails ?? [],
    [selectedAnnotation]
  );

  const hasPositionsTab = selectedPositions.length > 0;

  const selectedPositionLabels = React.useMemo(() => {
    return selectedPositions.map((position) => position.name ?? `Position ${position.id}`);
  }, [selectedPositions]);

  const selectedComponentGroups = React.useMemo(() => {
    const graphComponents = selectedAnnotation?._meta?.graphcomponentSet ?? [];
    if (!graphComponents.length) return [];

    return graphComponents.map((gc) => ({
      componentId: gc.component,
      componentName: gc.componentName ?? `Component ${gc.component}`,
      featureNames:
        gc.featureDetails?.map((feature) => feature.name) ??
        gc.features.map((featureId) => `Feature ${featureId}`),
    }));
  }, [selectedAnnotation]);

  const selectedNotes = React.useMemo(() => {
    return (selectedAnnotation?.body ?? [])
      .filter((body) => {
        const value = body.value?.trim() ?? '';
        return value.length > 0 && body.purpose !== 'commenting';
      })
      .map((body) => body.value!.trim());
  }, [selectedAnnotation]);

  const filteredA9s = React.useMemo(() => {
    if (countAllographId == null) return [];
    return a9sSnapshot.filter((a) => (a as A9sWithMeta)._meta?.allographId === countAllographId);
  }, [a9sSnapshot, countAllographId]);

  const highlightedIds = React.useMemo(() => {
    if (highlightAllographId == null) return [];

    return a9sSnapshot
      .filter(
        (a) =>
          (a as A9sWithMeta)._meta?.allographId === highlightAllographId &&
          a.id !== selectedAnnotation?.id
      )
      .map((a) => a.id);
  }, [a9sSnapshot, highlightAllographId, selectedAnnotation?.id]);

  const allographsForThisImage = React.useMemo(() => {
    if (!allographs.length) return [];

    if (!imageAllographIds.length) return allographs;

    const idSet = new Set(imageAllographIds);
    return allographs.filter((a) => idSet.has(a.id));
  }, [allographs, imageAllographIds]);

  const handIdsInImage = React.useMemo(() => {
    return Array.from(
      new Set(
        a9sSnapshot
          .map((a) => (a as A9sWithMeta)._meta?.handId)
          .filter((id): id is number => typeof id === 'number')
      )
    );
  }, [a9sSnapshot]);

  const handsForThisImage = React.useMemo(() => {
    if (!hands.length) return [];
    if (!handIdsInImage.length) return hands;

    const idSet = new Set(handIdsInImage);
    return hands.filter((hand) => idSet.has(hand.id));
  }, [hands, handIdsInImage]);

  const availableAllographFilterIds = React.useMemo(
    () => allographsForThisImage.map((allograph) => allograph.id),
    [allographsForThisImage]
  );

  const availableHandFilterIds = React.useMemo(
    () => handsForThisImage.map((hand) => hand.id),
    [handsForThisImage]
  );

  const allAllographFiltersSelected = React.useMemo(
    () => includesAllIds(availableAllographFilterIds, visibilityFilters.allographIds),
    [availableAllographFilterIds, visibilityFilters.allographIds]
  );

  const allHandFiltersSelected = React.useMemo(
    () => includesAllIds(availableHandFilterIds, visibilityFilters.handIds),
    [availableHandFilterIds, visibilityFilters.handIds]
  );

  const visibilityFiltersReady = allographFiltersInitialized && handFiltersInitialized;

  const isVisibilityFilterActive =
    visibilityFiltersReady &&
    (!allAllographFiltersSelected ||
      !allHandFiltersSelected ||
      (!isPublicDemoMode && !visibilityFilters.showEditorial) ||
      !visibilityFilters.showPublicAnnotations);

  const annotationVisibilityFilter = React.useCallback(
    (annotation: A9sAnnotation) => {
      if (!visibilityFiltersReady) return true;

      const isDraft = typeof annotation.id === 'string' && !annotation.id.startsWith('db:');
      if (isDraft) {
        return visibilityFilters.showPublicAnnotations;
      }

      const meta = (annotation as A9sWithMeta)._meta;
      const allographId = meta?.allographId;
      const handId = meta?.handId;

      const allographPass =
        !availableAllographFilterIds.length ||
        allographId == null ||
        visibilityFilters.allographIds.includes(allographId);

      const handPass =
        !availableHandFilterIds.length ||
        handId == null ||
        visibilityFilters.handIds.includes(handId);

      return allographPass && handPass;
    },
    [
      visibilityFiltersReady,
      visibilityFilters,
      availableAllographFilterIds.length,
      availableHandFilterIds.length,
    ]
  );

  // ---- Helpers / handlers ----
  const persistAnnotationCache = React.useCallback(() => {
    if (typeof window === 'undefined' || isPublicDemoMode || !manuscriptImage) return;

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
  }, [imageHeight, isPublicDemoMode, manuscriptImage]);

  const handleShareSelectedAnnotation = () => {
    if (!selectedAnnotation || typeof window === 'undefined') return;

    const url = new URL(window.location.href);

    if (isDraftAnnotation) {
      const draftBody: A9sAnnotation['body'] = [
        ...(draftAllographText.trim()
          ? [
            {
              type: 'TextualBody',
              purpose: 'commenting',
              value: draftAllographText.trim(),
            },
          ]
          : []),
        ...(draftNoteText.trim()
          ? [
            {
              type: 'TextualBody',
              purpose: 'describing',
              value: draftNoteText.trim(),
            },
          ]
          : []),
      ];

      const payload: DraftSharePayload = {
        id: selectedAnnotation.id,
        target: selectedAnnotation.target,
        body: draftBody,
        _meta: selectedAnnotation._meta,
      };

      url.searchParams.delete('graph');
      url.searchParams.set('draft', encodeDraftSharePayload(payload));
    } else {
      const graphId = selectedAnnotation.id.replace(/^db:/, '');
      if (!graphId) return;

      url.searchParams.delete('draft');
      url.searchParams.set('graph', graphId);
    }

    setShareUrl(url.toString());
    setIsShareUrlVisible(true);
  };

  const handleCopyShareUrl = async () => {
    if (!shareUrl) return;

    try {
      await navigator.clipboard.writeText(shareUrl);
    } catch {
      // ignore
    }
  };

  const resetAnnotationPopupState = () => {
    setSelectedAnnotation(null);
    setPopupTab('components');
    setIsShareUrlVisible(false);
    setShareUrl('');
    setDraftAllographText('');
    setDraftNoteText('');
    annotationPopupDrag.reset();
  };

  const rearmCreateTool = () => {
    setActiveButton('editorial');
    window.setTimeout(() => {
      viewerApiRef.current?.enableDraw();
    }, 0);
  };

  const handleCloseSelectedAnnotation = () => {
    viewerApiRef.current?.clearSelection?.();
    resetAnnotationPopupState();
  };

  const handleCancelDraftAnnotation = () => {
    const shouldResumeDraw = activeButton === 'editorial';

    viewerApiRef.current?.clearSelection?.();
    resetAnnotationPopupState();

    if (shouldResumeDraw) {
      rearmCreateTool();
    } else {
      viewerApiRef.current?.enablePan();
      setActiveButton('move');
    }
  };

  const handleSaveDraftAnnotation = async () => {
    if (!selectedAnnotation) return;

    const next: A9sAnnotation = {
      ...selectedAnnotation,
      body: [
        {
          type: 'TextualBody',
          purpose: 'commenting',
          value: draftAllographText.trim(),
        },
        ...(draftNoteText.trim()
          ? [
            {
              type: 'TextualBody',
              purpose: 'describing',
              value: draftNoteText.trim(),
            },
          ]
          : []),
      ],
    };

    await viewerApiRef.current?.updateSelectedDraft?.(next);
    await viewerApiRef.current?.saveSelectedDraft?.();
  };

  const handleConfirmDraftAnnotation = async () => {
    const shouldResumeDraw = activeButton === 'editorial';

    await handleSaveDraftAnnotation();
    resetAnnotationPopupState();

    if (shouldResumeDraw) {
      rearmCreateTool();
    } else {
      viewerApiRef.current?.enablePan();
      setActiveButton('move');
    }
  };

  const handleToggleFullScreen = () => {
    setIsFullScreen((prev) => !prev);

    if (typeof window !== 'undefined') {
      setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
      }, 0);
    }
  };

  const handleExposeApi = React.useCallback((api: ViewerApi) => {
    viewerApiRef.current = api;
    setOsdReady(true);

    api.enablePan();
    setActiveButton('move');
    setA9sSnapshot(api.getAnnotations?.() ?? []);
  }, []);

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

  const handleSave = React.useCallback(async (): Promise<void> => {
    if (isPublicDemoMode || !manuscriptImage) return;

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
              item_image: Number(manuscriptImage.id),
              annotation: feature,
              allograph: filteredAllograph?.id ?? 0,
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

      const refreshed = await fetchAnnotationsForImage(
        String(manuscriptImage.id),
        filteredAllograph?.id ? String(filteredAllograph.id) : undefined
      );
      const mapped = refreshed.map((a) => backendToA9sAnnotation(a, imageHeight));

      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(`annotations:${manuscriptImage.iiif_image}`, JSON.stringify(mapped));
          localStorage.setItem(
            `annotations:meta:${manuscriptImage.iiif_image}`,
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
  }, [filteredAllograph, imageHeight, imageId, isPublicDemoMode, manuscriptImage, selectedHand]);

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

  const handleToggleAllographFilter = React.useCallback((allographId: number) => {
    setVisibilityFilters((prev) => ({
      ...prev,
      allographIds: toggleNumericId(prev.allographIds, allographId),
    }));
  }, []);

  const handleToggleHandFilter = React.useCallback((handId: number) => {
    setVisibilityFilters((prev) => ({
      ...prev,
      handIds: toggleNumericId(prev.handIds, handId),
    }));
  }, []);

  const handleToggleAllAllographFilters = React.useCallback(() => {
    setVisibilityFilters((prev) => ({
      ...prev,
      allographIds: allAllographFiltersSelected ? [] : [...availableAllographFilterIds],
    }));
  }, [allAllographFiltersSelected, availableAllographFilterIds]);

  const handleToggleAllHandFilters = React.useCallback(() => {
    setVisibilityFilters((prev) => ({
      ...prev,
      handIds: allHandFiltersSelected ? [] : [...availableHandFilterIds],
    }));
  }, [allHandFiltersSelected, availableHandFilterIds]);

  // ---- Effects ----

  React.useEffect(() => {
    setHands([]);
    setHandsLoaded(false);

    setVisibilityFilters({
      allographIds: [],
      handIds: [],
      showEditorial: true,
      showPublicAnnotations: true,
    });

    setAllographFiltersInitialized(false);
    setHandFiltersInitialized(false);
    setIsFilterPanelOpen(false);
  }, [imageId]);

  React.useEffect(() => {
    let isMounted = true;

    const loadHands = async () => {
      try {
        const handsData = await fetchHands(imageId);
        if (isMounted) setHands(handsData.results);
      } catch {
        if (isMounted) setHands([]);
      } finally {
        if (isMounted) setHandsLoaded(true);
      }
    };

    void loadHands();

    return () => {
      isMounted = false;
    };
  }, [imageId]);

  React.useEffect(() => {
    if (allographFiltersInitialized) return;
    if (!manuscriptImage || !imageHeight) return;

    if (a9sSnapshot.length === 0 || availableAllographFilterIds.length > 0) {
      setVisibilityFilters((prev) => ({
        ...prev,
        allographIds: [...availableAllographFilterIds],
      }));
      setAllographFiltersInitialized(true);
    }
  }, [
    allographFiltersInitialized,
    manuscriptImage,
    imageHeight,
    a9sSnapshot.length,
    availableAllographFilterIds,
  ]);

  React.useEffect(() => {
    if (handFiltersInitialized) return;
    if (!handsLoaded) return;

    setVisibilityFilters((prev) => ({
      ...prev,
      handIds: [...availableHandFilterIds],
    }));
    setHandFiltersInitialized(true);
  }, [handFiltersInitialized, handsLoaded, availableHandFilterIds]);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const raw = localStorage.getItem('annotationViewerSettings');
      if (!raw) return;

      const parsed = JSON.parse(raw) as Partial<AnnotationViewerSettings>;
      setViewerSettings((prev) => ({
        allowMultipleBoxes: parsed.allowMultipleBoxes ?? prev.allowMultipleBoxes,
        selectMultipleAnnotations:
          parsed.selectMultipleAnnotations ?? prev.selectMultipleAnnotations,
        toolbarPosition:
          parsed.toolbarPosition === 'horizontal' ? 'horizontal' : prev.toolbarPosition,
      }));
    } catch {
      // ignore
    }
  }, []);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem('annotationViewerSettings', JSON.stringify(viewerSettings));
    } catch {
      // ignore
    }
  }, [viewerSettings]);

  // hydrate annotation visibility from localStorage
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = localStorage.getItem(`annotationsVisible:${imageId}`);
    if (saved !== null) {
      setAnnotationsEnabled(saved === 'true');
    }
  }, [imageId]);

  // keep popup share state reset when annotation changes
  React.useEffect(() => {
    setIsShareUrlVisible(false);
    setShareUrl('');
  }, [selectedAnnotation?.id]);

  // keep popup on valid tab
  React.useEffect(() => {
    if (!hasPositionsTab && popupTab === 'positions') {
      setPopupTab('components');
    }
  }, [hasPositionsTab, popupTab]);

  // sync viewer highlight state
  React.useEffect(() => {
    if (!osdReady) return;

    if (hoveredAnnotationId) {
      viewerApiRef.current?.highlightAnnotations?.([hoveredAnnotationId]);
      return;
    }

    if (highlightAllographId == null) {
      viewerApiRef.current?.clearHighlights?.();
      return;
    }

    viewerApiRef.current?.highlightAnnotations?.(highlightedIds);
  }, [osdReady, hoveredAnnotationId, highlightAllographId, highlightedIds]);

  // hydrate unsaved count
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

  // persist unsaved count
  React.useEffect(() => {
    if (typeof window === 'undefined' || isPublicDemoMode) return;

    try {
      localStorage.setItem(`unsaved:${imageId}`, String(unsavedChanges));
    } catch {
      // ignore
    }
  }, [unsavedChanges, imageId, isPublicDemoMode]);

  // sync annotation visibility into viewer
  React.useEffect(() => {
    if (!osdReady) return;
    viewerApiRef.current?.toggleAnnotations(annotationsEnabled);
  }, [annotationsEnabled, osdReady]);

  // load image + manuscript + allographs + IIIF height
  React.useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      try {
        setLoading(true);

        const [image, allographsData] = await Promise.all([
          fetchManuscriptImage(imageId),
          fetchAllographs(),
        ]);

        if (!isMounted) return;

        setManuscriptImage(image);
        setAllographs(allographsData);

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

  // load allograph ids present on this image
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

  // load annotations for current image / allograph filter
  React.useEffect(() => {
    if (!manuscriptImage || !imageHeight) return;

    let isMounted = true;

    const load = async () => {
      try {
        const list = await fetchAnnotationsForImage(String(manuscriptImage.id));
        if (!isMounted) return;

        const dbMapped: A9sAnnotation[] = list.map((a) =>
          backendToA9sAnnotation(a, imageHeight, allographNameById.get(a.allograph))
        );

        // Keep current unsaved local annotations so filter changes do not wipe them out.
        const currentViewerDrafts = (viewerApiRef.current?.getAnnotations?.() ?? []).filter(
          (a): a is A9sAnnotation => !isDbId(a?.id)
        );

        const iiif = manuscriptImage.iiif_image;
        const cacheKey = cacheKeyFor(iiif);
        const metaKey = metaKeyFor(iiif);

        const mergedIds = new Set(dbMapped.map((a) => a.id));
        let merged: A9sAnnotation[] = [
          ...dbMapped,
          ...currentViewerDrafts.filter((a) => !mergedIds.has(a.id)),
        ];

        if (typeof window !== 'undefined' && !isPublicDemoMode) {
          try {
            const raw = localStorage.getItem(cacheKey);
            const meta = JSON.parse(localStorage.getItem(metaKey) || '{}') as {
              imageHeight?: number;
            };

            if (raw && meta?.imageHeight === imageHeight) {
              const cached = JSON.parse(raw) as A9sAnnotation[];
              const localOnly = Array.isArray(cached) ? cached.filter((a) => !isDbId(a?.id)) : [];
              const existing = new Set(merged.map((a) => a.id));
              const extras = localOnly.filter((a) => !existing.has(a.id));
              merged = [...merged, ...extras];
            } else if (raw && meta?.imageHeight !== imageHeight) {
              localStorage.removeItem(cacheKey);
              localStorage.removeItem(metaKey);
            }
          } catch {
            // ignore
          }
        }

        if (typeof window !== 'undefined') {
          const url = new URL(window.location.href);
          const draftParam = url.searchParams.get('draft');

          if (draftParam) {
            const decoded = decodeDraftSharePayload(draftParam);

            if (decoded?.target) {
              const sharedDraft: A9sAnnotation = {
                id: decoded.id || 'draft:shared',
                type: 'Annotation',
                target: decoded.target,
                body: decoded.body ?? [],
                _meta: decoded._meta,
              };

              if (!merged.some((a) => a.id === sharedDraft.id)) {
                merged = [...merged, sharedDraft];
              }
            }
          }
        }

        if (isMounted) {
          setInitialA9sAnnots(merged);
          setA9sSnapshot(merged);
        }
      } catch {
        if (isMounted) {
          setInitialA9sAnnots([]);
          setA9sSnapshot([]);
        }
      }
    };

    void load();

    return () => {
      isMounted = false;
    };
  }, [manuscriptImage, imageHeight, filteredAllograph, allographNameById, isPublicDemoMode]);

  // Ctrl/Cmd+S save
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

  // open shared ?graph=... annotation on first valid load
  React.useEffect(() => {
    if (initialGraphHandledRef.current) return;
    if (!osdReady || typeof window === 'undefined') return;

    const url = new URL(window.location.href);

    const draftParam = url.searchParams.get('draft');
    if (draftParam) {
      if (!a9sSnapshot.length) return;

      const decoded = decodeDraftSharePayload(draftParam);
      const draftId = decoded?.id || 'draft:shared';
      const found = a9sSnapshot.find((a) => a.id === draftId) as A9sWithMeta | undefined;

      if (!found) return;

      initialGraphHandledRef.current = true;
      setSelectedAnnotation(found);
      setPopupTab('components');

      const title = found.body?.find((b) => b.purpose === 'commenting')?.value ?? '';
      const note = found.body?.find((b) => b.purpose !== 'commenting')?.value ?? '';

      setDraftAllographText(title);
      setDraftNoteText(note);

      viewerApiRef.current?.selectAnnotationById?.(draftId);
      viewerApiRef.current?.centerOnAnnotation?.(draftId);
      return;
    }

    if (!a9sSnapshot.length) return;

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

  // ---- Early returns ----
  if (loading) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

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

  const annotationHeader = (
    <AnnotationHeader
      annotationsEnabled={annotationsEnabled}
      onToggleAnnotations={handleToggleAnnotations}
      unsavedCount={unsavedChanges}
      showUnsavedCount={!isPublicDemoMode}
      imageId={imageId}
      onAllographSelect={setFilteredAllograph}
      onHandSelect={setSelectedHand}
      allographs={allographsForThisImage}
      onAllographHover={setHoveredAllograph}
      activeAllographCount={filteredA9s.length}
      activeAllographLabel={activeAllographLabel}
      selectedAllographId={dropdownAllograph?.id ?? null}
      onOpenAllographModal={() => {
        setHoveredAnnotationId(null);
        setIsAllographModalOpen(true);
      }}
      onOpenFilterPanel={() => {
        setIsFilterPanelOpen((prev) => {
          const next = !prev;
          if (!next) filterPanelDrag.reset();
          return next;
        });
      }}
      isVisibilityFilterActive={isVisibilityFilterActive}
      onOpenSettingsPanel={() => {
        setIsSettingsPanelOpen((prev) => {
          const next = !prev;
          if (!next) settingsPanelDrag.reset();
          return next;
        });
      }}
      isSettingsActive={isSettingsPanelOpen}
    />
  );

  // ---- Render ----
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
          {annotationHeader}
        </div>
      ) : (
        annotationHeader
      )}
      {isFilterPanelOpen && (
        <div
          className="fixed top-24 right-4 z-40 w-[380px] max-w-[calc(100vw-2rem)] rounded-lg border bg-background shadow-lg"
          style={{
            transform: `translate(${filterPanelDrag.pos.x}px, ${filterPanelDrag.pos.y}px)`,
          }}
        >
          <div
            className="flex items-center justify-between border-b px-4 py-3 cursor-move select-none"
            {...filterPanelDrag.bindDrag}
          >
            <h3 className="text-base font-semibold">Filter Annotations</h3>
            <div onPointerDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => {
                  setIsFilterPanelOpen(false);
                  filterPanelDrag.reset();
                }}
                type="button"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="max-h-[70vh] overflow-auto px-4 py-4">
            <div className="grid gap-6">
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-foreground">Allographs</h4>
                  <Button
                    variant="outline"
                    size="sm"
                    type="button"
                    onClick={handleToggleAllAllographFilters}
                  >
                    Toggle All
                  </Button>
                </div>

                <Separator className="mb-3" />

                <div className="max-h-[220px] space-y-2 overflow-auto pr-2">
                  {allographsForThisImage.length ? (
                    allographsForThisImage.map((allograph) => (
                      <label
                        key={allograph.id}
                        className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 hover:bg-muted/50"
                      >
                        <input
                          type="checkbox"
                          checked={visibilityFilters.allographIds.includes(allograph.id)}
                          onChange={() => handleToggleAllographFilter(allograph.id)}
                          className="h-4 w-4 rounded border-gray-300"
                        />
                        <span className="text-sm text-foreground">{allograph.name}</span>
                      </label>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No allographs available.</p>
                  )}
                </div>
              </div>

              <div>
                <div className="mb-3 flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-foreground">Hands</h4>
                  <Button
                    variant="outline"
                    size="sm"
                    type="button"
                    onClick={handleToggleAllHandFilters}
                  >
                    Toggle All
                  </Button>
                </div>

                <Separator className="mb-3" />

                <div className="max-h-[220px] space-y-2 overflow-auto pr-2">
                  {handsForThisImage.length ? (
                    handsForThisImage.map((hand) => (
                      <label
                        key={hand.id}
                        className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 hover:bg-muted/50"
                      >
                        <input
                          type="checkbox"
                          checked={visibilityFilters.handIds.includes(hand.id)}
                          onChange={() => handleToggleHandFilter(hand.id)}
                          className="h-4 w-4 rounded border-gray-300"
                        />
                        <span className="text-sm text-foreground">{hand.name}</span>
                      </label>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No hands available.</p>
                  )}
                </div>

                <div className="pt-4">
                  <Separator className="mb-3" />

                  {!isPublicDemoMode && (
                    <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 hover:bg-muted/50">
                      <input
                        type="checkbox"
                        checked={visibilityFilters.showEditorial}
                        onChange={() =>
                          setVisibilityFilters((prev) => ({
                            ...prev,
                            showEditorial: !prev.showEditorial,
                          }))
                        }
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      <span className="text-sm text-foreground">[Digipal Editor]</span>
                    </label>
                  )}

                  <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 hover:bg-muted/50">
                    <input
                      type="checkbox"
                      checked={visibilityFilters.showPublicAnnotations}
                      onChange={() =>
                        setVisibilityFilters((prev) => ({
                          ...prev,
                          showPublicAnnotations: !prev.showPublicAnnotations,
                        }))
                      }
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <span className="text-sm text-foreground">Public Annotations</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {isSettingsPanelOpen && (
        <div
          className="fixed top-24 right-4 z-40 w-[360px] max-w-[calc(100vw-2rem)] rounded-lg border bg-background shadow-lg"
          style={{
            transform: `translate(${settingsPanelDrag.pos.x}px, ${settingsPanelDrag.pos.y}px)`,
          }}
        >
          <div
            className="flex items-center justify-between border-b px-4 py-3 cursor-move select-none"
            {...settingsPanelDrag.bindDrag}
          >
            <h3 className="text-base font-semibold">Settings</h3>

            <div onPointerDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => {
                  setIsSettingsPanelOpen(false);
                  settingsPanelDrag.reset();
                }}
                type="button"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="max-h-[70vh] overflow-auto px-4 py-4 space-y-6">
            <div>
              <h4 className="text-sm font-semibold text-foreground">Annotation boxes</h4>
              <Separator className="my-3" />

              <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 hover:bg-muted/50">
                <input
                  type="checkbox"
                  checked={viewerSettings.allowMultipleBoxes}
                  onChange={() =>
                    setViewerSettings((prev) => ({
                      ...prev,
                      allowMultipleBoxes: !prev.allowMultipleBoxes,
                    }))
                  }
                  className="h-4 w-4 rounded border-gray-300"
                />
                <span className="text-sm text-foreground">Allow multiple boxes</span>
              </label>

              <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 hover:bg-muted/50">
                <input
                  type="checkbox"
                  checked={viewerSettings.selectMultipleAnnotations}
                  onChange={() =>
                    setViewerSettings((prev) => ({
                      ...prev,
                      selectMultipleAnnotations: !prev.selectMultipleAnnotations,
                    }))
                  }
                  className="h-4 w-4 rounded border-gray-300"
                />
                <span className="text-sm text-foreground">Select multiple annotations</span>
              </label>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-foreground">Toolbar position</h4>
              <Separator className="my-3" />

              <div className="flex gap-2">
                <Button
                  variant={viewerSettings.toolbarPosition === 'vertical' ? 'default' : 'outline'}
                  size="sm"
                  type="button"
                  onClick={() =>
                    setViewerSettings((prev) => ({
                      ...prev,
                      toolbarPosition: 'vertical',
                    }))
                  }
                >
                  Vertical
                </Button>

                <Button
                  variant={viewerSettings.toolbarPosition === 'horizontal' ? 'default' : 'outline'}
                  size="sm"
                  type="button"
                  onClick={() =>
                    setViewerSettings((prev) => ({
                      ...prev,
                      toolbarPosition: 'horizontal',
                    }))
                  }
                >
                  Horizontal
                </Button>
              </div>
            </div>
          </div>
        </div>
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
          className="w-[520px] max-w-[calc(100vw-2rem)] max-h-[72vh] overflow-auto"
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
        <Toolbar orientation={viewerSettings.toolbarPosition}>
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
              annotationFilter={annotationVisibilityFilter}
              disableEditor={true}
              // readOnly={isPublicDemoMode}
              readOnly={false}
              onCreate={() => {
                persistAnnotationCache();

                if (!isPublicDemoMode) {
                  setUnsavedChanges((n) => n + 1);
                }

                setA9sSnapshot(viewerApiRef.current?.getAnnotations?.() ?? []);
              }}
              onDelete={(a: A9sAnnotation) => {
                persistAnnotationCache();

                const id = a?.id as string | undefined;
                if (!isPublicDemoMode && id && !isDbId(id)) {
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
                setHoveredAnnotationId(null);

                if (selected && !isDbId(selected.id)) {
                  const title = selected.body?.find((b) => b.purpose === 'commenting')?.value ?? '';
                  const note = selected.body?.find((b) => b.purpose !== 'commenting')?.value ?? '';

                  setDraftAllographText(title);
                  setDraftNoteText(note);
                } else {
                  setDraftAllographText('');
                  setDraftNoteText('');
                }
              }}
              exposeApi={handleExposeApi}
            />

            {selectedAnnotation && (
              <AnnotationPopupCard
                title={isDraftAnnotation ? draftAllographText.trim() || 'New Annotation' : selectedAllographTitle}
                isDraftAnnotation={isDraftAnnotation}
                popupTransform={`translate(${annotationPopupDrag.pos.x}px, ${annotationPopupDrag.pos.y}px)`}
                dragHandleProps={annotationPopupDrag.bindDrag}
                isShareUrlVisible={isShareUrlVisible}
                shareUrl={shareUrl}
                onCopyShareUrl={handleCopyShareUrl}
                onHideShareUrl={() => setIsShareUrlVisible(false)}
                onShareSelectedAnnotation={handleShareSelectedAnnotation}
                onCloseSelectedAnnotation={handleCloseSelectedAnnotation}
                draftAllographText={draftAllographText}
                onDraftAllographTextChange={setDraftAllographText}
                draftNoteText={draftNoteText}
                onDraftNoteTextChange={setDraftNoteText}
                onCancelDraftAnnotation={handleCancelDraftAnnotation}
                onConfirmDraftAnnotation={() => {
                  void handleConfirmDraftAnnotation();
                }}
                popupTab={popupTab}
                onPopupTabChange={setPopupTab}
                hasPositionsTab={hasPositionsTab}
                selectedComponentGroups={selectedComponentGroups}
                selectedPositionLabels={selectedPositionLabels}
                selectedNotes={selectedNotes}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
