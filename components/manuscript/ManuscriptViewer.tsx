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
} from 'lucide-react';
import dynamic from 'next/dynamic';
import Link from 'next/link';

import { getIiifBaseUrl, getSelectorValue, iiifThumbFromSelector } from '@/utils/iiif';
import { ManuscriptTabs } from './manuscript-tabs';
import { DraggablePopupLayer } from './draggable-popup-layer';
import { Toolbar } from './toolbar';
import { AnnotationFilterPanel } from './annotation-filter-panel';
import { AnnotationSettingsPanel } from './annotation-settings-panel';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { AnnotationHeader } from '@/components/annotation/annotation-header';
import { AnnotationPopupCard } from '@/components/annotation/annotation-popup-card';
import { OpenLightboxButton } from '@/components/lightbox/open-lightbox-button';
import { fetchHands } from '@/services/manuscripts';
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
import type {
  A9sWithMeta,
  DraftSharePayload,
  AnnotationVisibilityFilters,
  AnnotationViewerSettings,
} from '@/types/annotation-viewer';

import {
  browserSafeIiifUrl,
  cacheKeyFor,
  decodeDraftSharePayload,
  encodeDraftSharePayload,
  includesAllIds,
  isDbId,
  metaKeyFor,
  toggleNumericId,
} from '@/lib/annotation-popup-utils';

import {
  getPopupCardViewData,
  getPopupInitialPosition,
  getPopupZIndex,
} from '@/lib/manuscript-viewer-popup-utils';

import {
  fetchImageAllographIds,
  fetchManuscriptViewerBaseData,
} from '@/lib/manuscript-viewer-data';

import { buildInitialViewerAnnotations } from '@/lib/manuscript-viewer-annotations';

import { useManuscriptPopups } from '@/hooks/use-manuscript-popups';
import { useDraggablePosition } from '@/hooks/useDraggablePosition';

const ManuscriptAnnotorious = dynamic(() => import('./ManuscriptAnnotorious'), { ssr: false });

interface ManuscriptViewerProps {
  imageId: string;
  mode?: 'public' | 'editor';
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
  const initialGraphHandledRef = React.useRef(false);
  const pendingPopupClearRef = React.useRef<number | null>(null);

  const [unsavedChanges, setUnsavedChanges] = React.useState<number>(0);

  const [isSettingsPanelOpen, setIsSettingsPanelOpen] = React.useState(false);
  const [viewerSettings, setViewerSettings] = React.useState<AnnotationViewerSettings>({
    allowMultipleBoxes: false,
    selectMultipleAnnotations: false,
    toolbarPosition: 'vertical',
  });

  const {
    openPopups,
    activePopupId,
    singlePopupPosition,
    activePopupRecord,
    visiblePopupRecords,
    handlePopupPositionChange,
    openPopupCollectionFromAnnotation,
    clearPopupCollection,
    getPopupById,
    removePopupById,
    updatePopupById,
    handleActivatePopup,
  } = useManuscriptPopups({
    allowMultipleBoxes: viewerSettings.allowMultipleBoxes,
  });

  // ---- Drag hooks ----
  const allographDialogDrag = useDraggablePosition({ x: 300, y: 60 });
  const filterPanelDrag = useDraggablePosition({ x: 0, y: 180 });
  const settingsPanelDrag = useDraggablePosition({ x: 0, y: 0 });

  // ---- Derived values ----
  const popupAnnotation = activePopupRecord?.annotation ?? null;

  const popupSelectedAllograph = React.useMemo(() => {
    const allographId = popupAnnotation?._meta?.allographId;
    if (allographId == null) return undefined;
    return allographs.find((a) => a.id === allographId);
  }, [allographs, popupAnnotation]);

  const popupSelectedHand = React.useMemo(() => {
    const handId = popupAnnotation?._meta?.handId;
    if (handId == null) return undefined;
    return hands.find((hand) => hand.id === handId);
  }, [hands, popupAnnotation]);

  const allographNameById = React.useMemo(
    () => new Map(allographs.map((a) => [a.id, a.name])),
    [allographs]
  );

  const displayedHand = popupSelectedHand ?? selectedHand ?? undefined;
  const activeHandLabel = displayedHand?.name ?? 'Any';

  const dropdownAllograph = filteredAllograph ?? popupSelectedAllograph ?? undefined;

  const displayAllograph =
    hoveredAllograph ?? filteredAllograph ?? popupSelectedAllograph ?? undefined;

  const activeAllographLabel = displayAllograph?.name ?? undefined;

  const countAllographId = displayAllograph?.id ?? null;

  const highlightAllographId =
    hoveredAllograph?.id ??
    filteredAllograph?.id ??
    (isAllographModalOpen ? (popupSelectedAllograph?.id ?? null) : null);

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
          a.id !== popupAnnotation?.id
      )
      .map((a) => a.id);
  }, [a9sSnapshot, highlightAllographId, popupAnnotation?.id]);

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

      const selectedHandPass = !selectedHand || (handId != null && handId === selectedHand.id);

      return allographPass && handPass && selectedHandPass;
    },
    [
      visibilityFiltersReady,
      visibilityFilters,
      availableAllographFilterIds.length,
      availableHandFilterIds.length,
      selectedHand,
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

  const clearSinglePopupState = React.useCallback(
    (options?: { clearHover?: boolean }) => {
      clearPopupCollection();

      if (options?.clearHover) {
        setHoveredAnnotationId(null);
      }
    },
    [clearPopupCollection]
  );

  const cancelPendingPopupClear = React.useCallback(() => {
    if (pendingPopupClearRef.current !== null) {
      window.clearTimeout(pendingPopupClearRef.current);
      pendingPopupClearRef.current = null;
    }
  }, []);

  const handlePopupTabChange = React.useCallback(
    (popupId: string, value: 'components' | 'positions' | 'notes') => {
      updatePopupById(popupId, { popupTab: value });
    },
    [updatePopupById]
  );

  const handleHideShareUrl = React.useCallback(
    (popupId: string) => {
      updatePopupById(popupId, { isShareUrlVisible: false });
    },
    [updatePopupById]
  );

  const handleDraftAllographTextChange = React.useCallback(
    (popupId: string, value: string) => {
      updatePopupById(popupId, { draftAllographText: value });
    },
    [updatePopupById]
  );

  const handleDraftNoteTextChange = React.useCallback(
    (popupId: string, value: string) => {
      updatePopupById(popupId, { draftNoteText: value });
    },
    [updatePopupById]
  );

  const openSinglePopupFromAnnotation = React.useCallback(
    (annotation: A9sWithMeta | null, options?: { clearHover?: boolean }) => {
      if (!annotation) {
        clearSinglePopupState({ clearHover: options?.clearHover });
        return;
      }

      setFilteredAllograph(undefined);

      if (options?.clearHover) {
        setHoveredAnnotationId(null);
      }

      const commonOverrides = {
        popupTab: 'components' as const,
        shareUrl: '',
        isShareUrlVisible: false,
        draftAllographText: !isDbId(annotation.id)
          ? (annotation.body?.find((b) => b.purpose === 'commenting')?.value ?? '')
          : '',
        draftNoteText: !isDbId(annotation.id)
          ? (annotation.body?.find((b) => b.purpose !== 'commenting')?.value ?? '')
          : '',
      };

      openPopupCollectionFromAnnotation(annotation, {
        mode: viewerSettings.allowMultipleBoxes ? 'append' : 'replace',
        overrides: commonOverrides,
      });
    },
    [clearSinglePopupState, openPopupCollectionFromAnnotation, viewerSettings.allowMultipleBoxes]
  );

  const handleShareSelectedAnnotation = React.useCallback(
    (popupId: string) => {
      const popup = getPopupById(popupId);
      if (!popup || typeof window === 'undefined') return;

      const annotation = popup.annotation;
      const isDraft = !isDbId(annotation.id);
      const url = new URL(window.location.href);

      if (isDraft) {
        const draftBody: A9sAnnotation['body'] = [
          ...(popup.draftAllographText.trim()
            ? [
                {
                  type: 'TextualBody',
                  purpose: 'commenting',
                  value: popup.draftAllographText.trim(),
                },
              ]
            : []),
          ...(popup.draftNoteText.trim()
            ? [
                {
                  type: 'TextualBody',
                  purpose: 'describing',
                  value: popup.draftNoteText.trim(),
                },
              ]
            : []),
        ];

        const payload: DraftSharePayload = {
          id: annotation.id,
          target: annotation.target,
          body: draftBody,
          _meta: annotation._meta,
        };

        url.searchParams.delete('graph');
        url.searchParams.set('draft', encodeDraftSharePayload(payload));
      } else {
        const graphId = annotation.id.replace(/^db:/, '');
        if (!graphId) return;

        url.searchParams.delete('draft');
        url.searchParams.set('graph', graphId);
      }

      updatePopupById(popupId, {
        shareUrl: url.toString(),
        isShareUrlVisible: true,
      });
    },
    [getPopupById, updatePopupById]
  );

  const handleCopyShareUrl = async (popupId: string) => {
    const value = getPopupById(popupId)?.shareUrl ?? '';
    if (!value) return;

    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // ignore
    }
  };

  const rearmCreateTool = () => {
    setActiveButton('editorial');
    window.setTimeout(() => {
      viewerApiRef.current?.enableDraw();
    }, 0);
  };

  const handleCloseSelectedAnnotation = React.useCallback(
    (popupId: string) => {
      const popup = getPopupById(popupId);
      const shouldResumeDraw =
        activeButton === 'editorial' && Boolean(popup && !isDbId(popup.annotation.id));

      viewerApiRef.current?.clearSelection?.();
      removePopupById(popupId);

      if (shouldResumeDraw) {
        rearmCreateTool();
      }
    },
    [activeButton, getPopupById, removePopupById]
  );

  const handleCancelDraftAnnotation = React.useCallback(
    (popupId: string) => {
      const popup = getPopupById(popupId);
      const shouldResumeDraw =
        activeButton === 'editorial' && Boolean(popup && !isDbId(popup.annotation.id));

      viewerApiRef.current?.clearSelection?.();
      removePopupById(popupId);

      if (shouldResumeDraw) {
        rearmCreateTool();
      } else {
        viewerApiRef.current?.enablePan();
        setActiveButton('move');
      }
    },
    [activeButton, getPopupById, removePopupById]
  );

  const handleSaveDraftAnnotation = React.useCallback(
    async (popupId: string) => {
      const popup = getPopupById(popupId);
      if (!popup) return;

      const next: A9sAnnotation = {
        ...popup.annotation,
        body: [
          {
            type: 'TextualBody',
            purpose: 'commenting',
            value: popup.draftAllographText.trim(),
          },
          ...(popup.draftNoteText.trim()
            ? [
                {
                  type: 'TextualBody',
                  purpose: 'describing',
                  value: popup.draftNoteText.trim(),
                },
              ]
            : []),
        ],
      };

      await viewerApiRef.current?.updateSelectedDraft?.(next);
      await viewerApiRef.current?.saveSelectedDraft?.();
    },
    [getPopupById]
  );

  const handleConfirmDraftAnnotation = React.useCallback(
    async (popupId: string) => {
      const popup = getPopupById(popupId);
      const shouldResumeDraw =
        activeButton === 'editorial' && Boolean(popup && !isDbId(popup.annotation.id));

      await handleSaveDraftAnnotation(popupId);
      removePopupById(popupId);

      if (shouldResumeDraw) {
        rearmCreateTool();
      } else {
        viewerApiRef.current?.enablePan();
        setActiveButton('move');
      }
    },
    [activeButton, getPopupById, handleSaveDraftAnnotation, removePopupById]
  );

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

  const toggleFilterPanel = React.useCallback(() => {
    setIsFilterPanelOpen((prev) => {
      const next = !prev;
      if (!next) filterPanelDrag.reset();
      return next;
    });
  }, [filterPanelDrag]);

  const toggleSettingsPanel = React.useCallback(() => {
    setIsSettingsPanelOpen((prev) => {
      const next = !prev;
      if (!next) settingsPanelDrag.reset();
      return next;
    });
  }, [settingsPanelDrag]);

  const handleSelectAnnotationFromViewer = React.useCallback(
    (annotation: A9sAnnotation | null) => {
      cancelPendingPopupClear();

      const selected = (annotation as A9sWithMeta | null) ?? null;

      if (selected) {
        openSinglePopupFromAnnotation(selected, { clearHover: true });
        return;
      }

      pendingPopupClearRef.current = window.setTimeout(() => {
        pendingPopupClearRef.current = null;
        clearSinglePopupState({ clearHover: true });
      }, 50);
    },
    [cancelPendingPopupClear, clearSinglePopupState, openSinglePopupFromAnnotation]
  );

  const handleCloseFilterPanel = React.useCallback(() => {
    setIsFilterPanelOpen(false);
    filterPanelDrag.reset();
  }, [filterPanelDrag]);

  const handleCloseSettingsPanel = React.useCallback(() => {
    setIsSettingsPanelOpen(false);
    settingsPanelDrag.reset();
  }, [settingsPanelDrag]);

  const handleToggleEditorialVisibility = React.useCallback(() => {
    setVisibilityFilters((prev) => ({
      ...prev,
      showEditorial: !prev.showEditorial,
    }));
  }, []);

  const handleTogglePublicAnnotationsVisibility = React.useCallback(() => {
    setVisibilityFilters((prev) => ({
      ...prev,
      showPublicAnnotations: !prev.showPublicAnnotations,
    }));
  }, []);

  const handleToggleAllowMultipleBoxes = React.useCallback(() => {
    setViewerSettings((prev) => ({
      ...prev,
      allowMultipleBoxes: !prev.allowMultipleBoxes,
    }));
  }, []);

  const handleToggleSelectMultipleAnnotations = React.useCallback(() => {
    setViewerSettings((prev) => ({
      ...prev,
      selectMultipleAnnotations: !prev.selectMultipleAnnotations,
    }));
  }, []);

  const handleSetToolbarPosition = React.useCallback((position: 'vertical' | 'horizontal') => {
    setViewerSettings((prev) => ({
      ...prev,
      toolbarPosition: position,
    }));
  }, []);
  // ---- Effects ----

  React.useEffect(() => {
    setHands([]);
    setHandsLoaded(false);
    setSelectedHand(undefined);

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
    if (!manuscriptImage?.item_part) {
      setHands([]);
      setHandsLoaded(false);
      return;
    }

    let isMounted = true;

    const loadHands = async () => {
      try {
        const handsData = await fetchHands(manuscriptImage.item_part);
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
  }, [manuscriptImage?.item_part]);

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
    if (!isAllographModalOpen) return;

    const hasContextAllograph = Boolean(filteredAllograph || popupSelectedAllograph);

    if (!hasContextAllograph) {
      setIsAllographModalOpen(false);
      allographDialogDrag.reset();
    }
  }, [isAllographModalOpen, filteredAllograph, popupSelectedAllograph, allographDialogDrag]);

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

  React.useEffect(() => {
    return () => {
      if (pendingPopupClearRef.current !== null) {
        window.clearTimeout(pendingPopupClearRef.current);
      }
    };
  }, []);

  // hydrate annotation visibility from localStorage
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = localStorage.getItem(`annotationsVisible:${imageId}`);
    if (saved !== null) {
      setAnnotationsEnabled(saved === 'true');
    }
  }, [imageId]);

  // keep popup on valid tab
  React.useEffect(() => {
    if (!activePopupRecord) return;

    const popupCard = getPopupCardViewData(activePopupRecord, allographNameById);

    if (!popupCard.hasPositionsTab && activePopupRecord.popupTab === 'positions') {
      handlePopupTabChange(activePopupRecord.id, 'components');
    }
  }, [activePopupRecord, allographNameById, handlePopupTabChange]);

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

        const { image, manuscript, allographs, imageHeight } =
          await fetchManuscriptViewerBaseData(imageId);

        if (!isMounted) return;

        setManuscriptImage(image);
        setManuscript(manuscript);
        setAllographs(allographs);
        setImageHeight(imageHeight);
        setError(null);
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
        const ids = await fetchImageAllographIds(String(manuscriptImage.id));
        if (!isMounted) return;

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
        const merged = await buildInitialViewerAnnotations({
          itemImageId: String(manuscriptImage.id),
          iiifImage: manuscriptImage.iiif_image,
          imageHeight,
          allographNameById,
          isPublicDemoMode,
          currentViewerAnnotations: viewerApiRef.current?.getAnnotations?.() ?? [],
        });

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
      openSinglePopupFromAnnotation(found);

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

    openSinglePopupFromAnnotation(found);

    viewerApiRef.current?.selectAnnotationById?.(targetId);
    viewerApiRef.current?.centerOnAnnotation?.(targetId);
  }, [osdReady, a9sSnapshot, openSinglePopupFromAnnotation]);

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
      onAllographSelect={setFilteredAllograph}
      onHandSelect={setSelectedHand}
      allographs={allographsForThisImage}
      hands={handsForThisImage}
      onAllographHover={setHoveredAllograph}
      activeAllographCount={filteredA9s.length}
      activeAllographLabel={activeAllographLabel}
      selectedAllographId={dropdownAllograph?.id ?? null}
      selectedHandId={displayedHand?.id ?? null}
      onOpenAllographModal={() => {
        setHoveredAnnotationId(null);
        setIsAllographModalOpen(true);
      }}
      onOpenFilterPanel={toggleFilterPanel}
      isVisibilityFilterActive={isVisibilityFilterActive}
      onOpenSettingsPanel={toggleSettingsPanel}
      isSettingsActive={isSettingsPanelOpen}
    />
  );

  // ---- Render ----
  return (
    <div
      data-open-popups-count={openPopups.length}
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
      <AnnotationFilterPanel
        isOpen={isFilterPanelOpen}
        transform={`translate(${filterPanelDrag.pos.x}px, ${filterPanelDrag.pos.y}px)`}
        dragHandleProps={filterPanelDrag.bindDrag}
        allographs={allographsForThisImage}
        hands={handsForThisImage}
        selectedAllographIds={visibilityFilters.allographIds}
        selectedHandIds={visibilityFilters.handIds}
        showEditorialToggle={!isPublicDemoMode}
        showEditorial={visibilityFilters.showEditorial}
        showPublicAnnotations={visibilityFilters.showPublicAnnotations}
        onClose={handleCloseFilterPanel}
        onToggleAllAllographs={handleToggleAllAllographFilters}
        onToggleAllHands={handleToggleAllHandFilters}
        onToggleAllograph={handleToggleAllographFilter}
        onToggleHand={handleToggleHandFilter}
        onToggleEditorial={handleToggleEditorialVisibility}
        onTogglePublicAnnotations={handleTogglePublicAnnotationsVisibility}
      />

      <AnnotationSettingsPanel
        isOpen={isSettingsPanelOpen}
        transform={`translate(${settingsPanelDrag.pos.x}px, ${settingsPanelDrag.pos.y}px)`}
        dragHandleProps={settingsPanelDrag.bindDrag}
        viewerSettings={viewerSettings}
        onClose={handleCloseSettingsPanel}
        onToggleAllowMultipleBoxes={handleToggleAllowMultipleBoxes}
        onToggleSelectMultipleAnnotations={handleToggleSelectMultipleAnnotations}
        onSetToolbarPosition={handleSetToolbarPosition}
      />
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
          onPointerDownOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
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
              onSelect={handleSelectAnnotationFromViewer}
              exposeApi={handleExposeApi}
            />

            {visiblePopupRecords.map((popupRecord, index) => {
              const popupCard = getPopupCardViewData(popupRecord, allographNameById);
              const isActive = popupRecord.id === activePopupId;
              const { x: initialX, y: initialY } = getPopupInitialPosition(
                index,
                viewerSettings.allowMultipleBoxes,
                singlePopupPosition
              );
              const zIndex = getPopupZIndex(index, isActive);

              return (
                <DraggablePopupLayer
                  key={popupRecord.id || `popup-${index}`}
                  popupId={popupRecord.id}
                  initialX={initialX}
                  initialY={initialY}
                  zIndex={zIndex}
                  onActivate={handleActivatePopup}
                  onPositionChange={handlePopupPositionChange}
                >
                  {({ popupTransform, dragHandleProps, zIndex, onPointerDownCapture }) => (
                    <AnnotationPopupCard
                      title={popupCard.title}
                      isDraftAnnotation={popupCard.isDraft}
                      popupTransform={popupTransform}
                      dragHandleProps={dragHandleProps}
                      zIndex={zIndex}
                      onPointerDownCapture={onPointerDownCapture}
                      isShareUrlVisible={popupRecord.isShareUrlVisible}
                      shareUrl={popupRecord.shareUrl}
                      onCopyShareUrl={() => void handleCopyShareUrl(popupRecord.id)}
                      onHideShareUrl={() => handleHideShareUrl(popupRecord.id)}
                      onShareSelectedAnnotation={() =>
                        handleShareSelectedAnnotation(popupRecord.id)
                      }
                      onCloseSelectedAnnotation={() =>
                        handleCloseSelectedAnnotation(popupRecord.id)
                      }
                      draftAllographText={popupRecord.draftAllographText}
                      onDraftAllographTextChange={(value) =>
                        handleDraftAllographTextChange(popupRecord.id, value)
                      }
                      draftNoteText={popupRecord.draftNoteText}
                      onDraftNoteTextChange={(value) =>
                        handleDraftNoteTextChange(popupRecord.id, value)
                      }
                      onCancelDraftAnnotation={() => handleCancelDraftAnnotation(popupRecord.id)}
                      onConfirmDraftAnnotation={() => {
                        void handleConfirmDraftAnnotation(popupRecord.id);
                      }}
                      popupTab={popupRecord.popupTab}
                      onPopupTabChange={(value) => handlePopupTabChange(popupRecord.id, value)}
                      hasPositionsTab={popupCard.hasPositionsTab}
                      selectedComponentGroups={popupCard.selectedComponentGroups}
                      selectedPositionLabels={popupCard.selectedPositionLabels}
                      selectedNotes={popupCard.selectedNotes}
                    />
                  )}
                </DraggablePopupLayer>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
