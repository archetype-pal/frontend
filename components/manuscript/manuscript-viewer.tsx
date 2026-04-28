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

import { useAuth } from '@/contexts/auth-context';

import { getIiifBaseUrl } from '@/utils/iiif';
import { DraggablePopupLayer } from './draggable-popup-layer';
import { Toolbar } from './toolbar';
import { AnnotationFilterPanel } from './annotation-filter-panel';
import { AnnotationSettingsPanel } from './annotation-settings-panel';
import { AllographGalleryDialog } from './allograph-gallery-dialog';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AnnotationHeader } from '@/components/annotation/annotation-header';
import { AnnotationPopupCard } from '@/components/annotation/annotation-popup-card';
import { OpenLightboxButton } from '@/components/lightbox/open-lightbox-button';
import { fetchHands } from '@/services/manuscripts';
import {
  fetchAnnotationsForImage,
  createViewerAnnotation,
  updateViewerAnnotation,
  deleteViewerAnnotation,
} from '@/services/annotations';
import {
  backendToA9sAnnotation,
  a9sToBackendFeature,
  isDbAnnotation,
  dbIdFromA9s,
} from '@/lib/anno-mapping';

import {
  canCreateAnnotationKind,
  canPersistAnnotationKind,
  getDefaultAnnotationCreationKind,
  getViewerCapabilities,
} from '@/lib/viewer-capabilities';

import type { ViewerApi, Annotation as A9sAnnotation } from './manuscript-annotorious';
import type { ManuscriptImage as ManuscriptImageType } from '@/types/manuscript-image';
import type { Allograph } from '@/types/allographs';
import type { HandType } from '@/types/hands';
import type { Manuscript } from '@/types/manuscript';
import type {
  A9sGraphComponent,
  A9sWithMeta,
  DraftSharePayload,
  AnnotationVisibilityFilters,
  ViewerCapabilities,
  ViewerMode,
  AnnotationCreationKind,
  AnnotationEditorRecordMap,
} from '@/types/annotation-viewer';

import {
  browserSafeIiifUrl,
  decodeDraftSharePayload,
  encodeDraftSharePayload,
  includesAllIds,
  isDbId,
  toggleNumericId,
} from '@/lib/annotation-popup-utils';

import {
  getAnnotationKindFromPopupRecord,
  getPopupCapabilities,
  getPopupCardViewData,
  getPopupInitialPosition,
  getPopupMetaSummary,
  getPopupZIndex,
  getPopupEditorMode,
} from '@/lib/manuscript-viewer-popup-utils';

import {
  fetchImageAllographIds,
  fetchManuscriptViewerBaseData,
} from '@/lib/manuscript-viewer-data';

import { buildInitialViewerAnnotations } from '@/lib/manuscript-viewer-annotations';

import {
  buildHydratedEditorRecordMap,
  countDirtyEditorRecords,
  markAnnotationCreated,
  markAnnotationDeleted,
  markAnnotationUpdated,
} from '@/lib/manuscript-viewer-editor-state';

import { useManuscriptPopups } from '@/hooks/use-manuscript-popups';
import { useDraggablePosition } from '@/hooks/use-draggable-position';
import { useAnnotationViewerSettings } from '@/hooks/use-annotation-viewer-settings';

const ManuscriptAnnotorious = dynamic(() => import('./manuscript-annotorious'), { ssr: false });

interface ManuscriptViewerProps {
  imageId: string;
  mode?: ViewerMode;
  capabilities?: ViewerCapabilities;
}

export default function ManuscriptViewer({
  imageId,
  mode = 'public',
  capabilities,
}: ManuscriptViewerProps): React.JSX.Element {
  const viewerCapabilities = React.useMemo(
    () => capabilities ?? getViewerCapabilities(mode),
    [capabilities, mode]
  );

  const { token } = useAuth();

  const isPublicDemoMode = mode === 'public';

  const canCreatePublicAnnotations = viewerCapabilities.canCreatePublicAnnotations;
  const canPersistPublicAnnotations = viewerCapabilities.canPersistPublicAnnotations;
  const canCreateEditorialAnnotations = viewerCapabilities.canCreateEditorialAnnotations;
  const canPersistEditorialAnnotations = viewerCapabilities.canPersistEditorialAnnotations;
  const canDeleteAnnotations = viewerCapabilities.canDeleteAnnotations;
  const _canModifyAnnotations = viewerCapabilities.canModifyAnnotations;
  const canViewEditorialControls = viewerCapabilities.canViewEditorialControls;
  const canUseSettings = viewerCapabilities.canUseSettings;
  const canUseEditorSettings = viewerCapabilities.canUseEditorSettings;

  const canPersistAnyAnnotations = canPersistPublicAnnotations || canPersistEditorialAnnotations;

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
  const [selectedAnnotationIds, setSelectedAnnotationIds] = React.useState<string[]>([]);
  const [editorRecords, setEditorRecords] = React.useState<AnnotationEditorRecordMap>({});

  const [imageHeight, setImageHeight] = React.useState<number>(0);
  const [activeTool, setActiveTool] = React.useState<'move' | 'draw' | 'delete'>('move');
  const [currentCreationKind, setCurrentCreationKind] =
    React.useState<AnnotationCreationKind>('public');

  const [isFullScreen, setIsFullScreen] = React.useState(false);

  const [hoveredAllograph, setHoveredAllograph] = React.useState<Allograph | undefined>(undefined);
  const [isAllographModalOpen, setIsAllographModalOpen] = React.useState(false);
  const [hoveredAnnotationId, setHoveredAnnotationId] = React.useState<string | null>(null);
  const initialGraphHandledRef = React.useRef(false);
  const pendingPopupClearRef = React.useRef<number | null>(null);

  const unsavedChanges = React.useMemo(
    () => countDirtyEditorRecords(editorRecords),
    [editorRecords]
  );

  const [isSettingsPanelOpen, setIsSettingsPanelOpen] = React.useState(false);

  const {
    viewerSettings,
    handleToggleAllowMultipleBoxes,
    handleToggleSelectMultipleAnnotations,
    handleSetToolbarPosition,
  } = useAnnotationViewerSettings();

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
  const filterPanelDrag = useDraggablePosition({ x: 0, y: 250 });
  const settingsPanelDrag = useDraggablePosition({ x: 0, y: 250 });

  // ---- Derived values ----
  const getCanonicalAnnotation = React.useCallback(
    (annotation: A9sAnnotation): A9sWithMeta => {
      return (editorRecords[annotation.id]?.annotation ?? annotation) as A9sWithMeta;
    },
    [editorRecords]
  );

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
  const handNameById = React.useMemo(
    () => new Map(hands.map((hand) => [hand.id, hand.name])),
    [hands]
  );

  const positionNameById = React.useMemo(() => {
    const entries = allographs.flatMap((allograph) =>
      (allograph.positions ?? []).map((position) => [position.id, position.name] as const)
    );

    return new Map<number, string>(entries);
  }, [allographs]);

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
      (canViewEditorialControls && !visibilityFilters.showEditorial) ||
      !visibilityFilters.showPublicAnnotations);

  const annotationVisibilityFilter = React.useCallback(
    (annotation: A9sAnnotation) => {
      if (!visibilityFiltersReady) return true;

      const canonical = getCanonicalAnnotation(annotation);
      const isDraft = !isDbId(canonical.id);
      const meta = canonical._meta;
      const isExplicitEditorial = meta?.annotationType === 'editorial';

      const kindPass = isExplicitEditorial
        ? visibilityFilters.showEditorial
        : isDraft
          ? visibilityFilters.showPublicAnnotations
          : true;

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

      return kindPass && allographPass && handPass && selectedHandPass;
    },
    [
      visibilityFiltersReady,
      visibilityFilters,
      availableAllographFilterIds.length,
      availableHandFilterIds.length,
      selectedHand,
      getCanonicalAnnotation,
    ]
  );

  // ---- Helpers / handlers ----
  const getAnnotationKind = React.useCallback(
    (annotation: A9sAnnotation): AnnotationCreationKind => {
      const canonical = getCanonicalAnnotation(annotation);
      return canonical._meta?.annotationType === 'editorial' ? 'editorial' : 'public';
    },
    [getCanonicalAnnotation]
  );

  const getStandardSaveValidationError = React.useCallback(
    (annotation: A9sAnnotation): string | null => {
      const kind = getAnnotationKind(annotation);

      if (kind === 'editorial') {
        return 'Saving editorial annotations is not implemented yet.';
      }

      const allographId = annotation._meta?.allographId;
      const handId = annotation._meta?.handId;

      if (typeof allographId !== 'number' || allographId <= 0) {
        return 'Choose an allograph from the dropdown before saving a new annotation.';
      }

      if (typeof handId !== 'number' || handId <= 0) {
        return 'Choose a hand from the dropdown before saving a new annotation.';
      }

      return null;
    },
    [getAnnotationKind]
  );

  const decorateCreatedAnnotation = React.useCallback(
    (annotation: A9sAnnotation): A9sWithMeta => {
      return {
        ...annotation,
        _meta: {
          ...annotation._meta,
          allographId: filteredAllograph?.id ?? annotation._meta?.allographId,
          handId: selectedHand?.id ?? annotation._meta?.handId,
          annotationType: currentCreationKind,
        },
      } as A9sWithMeta;
    },
    [filteredAllograph?.id, selectedHand?.id, currentCreationKind]
  );

  const handleViewerCreate = React.useCallback(
    (annotation: A9sAnnotation) => {
      const enriched = decorateCreatedAnnotation(annotation);

      const syncCreatedAnnotation = async () => {
        await viewerApiRef.current?.updateSelectedDraft?.(enriched);

        updatePopupById(enriched.id, { annotation: enriched });

        setEditorRecords((prev) => markAnnotationCreated(prev, enriched));

        const currentAnnotations = viewerApiRef.current?.getAnnotations?.() ?? [];
        const nextAnnotations = currentAnnotations.some((item) => item.id === enriched.id)
          ? currentAnnotations.map((item) => (item.id === enriched.id ? enriched : item))
          : [...currentAnnotations, enriched];

        setA9sSnapshot(nextAnnotations);
      };

      void syncCreatedAnnotation();
    },
    [decorateCreatedAnnotation, updatePopupById]
  );

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

  const handleDraftAllographIdChange = React.useCallback(
    (popupId: string, value: number | null) => {
      updatePopupById(popupId, {
        draftAllographId: value,
        draftAllographText: value != null ? (allographNameById.get(value) ?? '') : '',
        draftGraphcomponentSet: [],
        draftPositionIds: [],
      });
    },
    [allographNameById, updatePopupById]
  );

  const handleDraftHandIdChange = React.useCallback(
    (popupId: string, value: number | null) => {
      updatePopupById(popupId, {
        draftHandId: value,
      });
    },
    [updatePopupById]
  );

  const handleDraftAllographTextChange = React.useCallback(
    (popupId: string, value: string) => {
      updatePopupById(popupId, { draftAllographText: value });
    },
    [updatePopupById]
  );

  const handleDraftGraphcomponentSetChange = React.useCallback(
    (popupId: string, value: A9sGraphComponent[]) => {
      updatePopupById(popupId, { draftGraphcomponentSet: value });
    },
    [updatePopupById]
  );

  const handleDraftPositionIdsChange = React.useCallback(
    (popupId: string, value: number[]) => {
      updatePopupById(popupId, { draftPositionIds: value });
    },
    [updatePopupById]
  );

  const handleDraftNoteTextChange = React.useCallback(
    (popupId: string, value: string) => {
      updatePopupById(popupId, { draftNoteText: value });
    },
    [updatePopupById]
  );

  const handleDraftInternalNoteTextChange = React.useCallback(
    (popupId: string, value: string) => {
      updatePopupById(popupId, { draftInternalNoteText: value });
    },
    [updatePopupById]
  );

  const handleDraftPublicNoteTextChange = React.useCallback(
    (popupId: string, value: string) => {
      updatePopupById(popupId, { draftPublicNoteText: value });
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

      const isDraft = !isDbId(annotation.id);

      const annotationForPopup: A9sWithMeta =
        isDraft && activeTool === 'draw'
          ? ({
              ...annotation,
              _meta: {
                ...annotation._meta,
                annotationType: annotation._meta?.annotationType ?? currentCreationKind,
              },
            } as A9sWithMeta)
          : annotation;

      const commonOverrides = {
        popupTab: 'components' as const,
        shareUrl: '',
        isShareUrlVisible: false,
        draftAllographText: !isDbId(annotationForPopup.id)
          ? (annotationForPopup.body?.find((b) => b.purpose === 'commenting')?.value ?? '')
          : '',
        draftNoteText: !isDbId(annotationForPopup.id)
          ? (annotationForPopup.body?.find((b) => b.purpose !== 'commenting')?.value ?? '')
          : '',
        draftAllographId: annotationForPopup._meta?.allographId ?? null,
        draftHandId: annotationForPopup._meta?.handId ?? null,
        draftInternalNoteText: !isDbId(annotationForPopup.id)
          ? (annotationForPopup.body?.find((b) => b.purpose === 'commenting')?.value ?? '')
          : '',
        draftPublicNoteText: !isDbId(annotationForPopup.id)
          ? (annotationForPopup.body?.find((b) => b.purpose !== 'commenting')?.value ?? '')
          : '',
        draftGraphcomponentSet: annotationForPopup._meta?.graphcomponentSet ?? [],
        draftPositionIds: annotationForPopup._meta?.positions ?? [],
      };

      openPopupCollectionFromAnnotation(annotationForPopup, {
        mode: isDraft ? 'replace' : viewerSettings.allowMultipleBoxes ? 'append' : 'replace',
        overrides: commonOverrides,
      });
    },
    [
      activeTool,
      clearSinglePopupState,
      currentCreationKind,
      openPopupCollectionFromAnnotation,
      viewerSettings.allowMultipleBoxes,
    ]
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

  const rearmCreateTool = React.useCallback(() => {
    setActiveTool('draw');
    window.setTimeout(() => {
      viewerApiRef.current?.enableDraw();
    }, 0);
  }, []);

  const closeDraftPopup = React.useCallback(
    (popupId: string) => {
      const popup = getPopupById(popupId);
      if (!popup) return;

      const shouldResumeDraw = activeTool === 'draw' && Boolean(!isDbId(popup.annotation.id));

      cancelPendingPopupClear();
      viewerApiRef.current?.clearSelection?.();
      removePopupById(popupId);

      if (shouldResumeDraw) {
        rearmCreateTool();
      } else {
        viewerApiRef.current?.enablePan();
        setActiveTool('move');
      }
    },
    [activeTool, cancelPendingPopupClear, getPopupById, removePopupById, rearmCreateTool]
  );

  const handleCloseSelectedAnnotation = React.useCallback(
    (popupId: string) => {
      closeDraftPopup(popupId);
    },
    [closeDraftPopup]
  );

  const handleCancelDraftAnnotation = React.useCallback(
    (popupId: string) => {
      closeDraftPopup(popupId);
    },
    [closeDraftPopup]
  );

  const buildStandardAnnotationFromPopup = React.useCallback(
    (popupId: string): A9sAnnotation | null => {
      const popup = getPopupById(popupId);
      if (!popup) return null;

      const nextPositionDetails = popup.draftPositionIds
        .map((id) => {
          const name = positionNameById.get(id);
          return name ? { id, name } : null;
        })
        .filter((value): value is { id: number; name: string } => value !== null);

      return {
        ...popup.annotation,
        _meta: {
          ...popup.annotation._meta,
          allographId: popup.draftAllographId ?? undefined,
          handId: popup.draftHandId ?? undefined,
          graphcomponentSet: popup.draftGraphcomponentSet,
          positions: popup.draftPositionIds,
          positionDetails: nextPositionDetails,
        },
      };
    },
    [getPopupById, positionNameById]
  );

  const getSelectedDraftIdsForPopup = React.useCallback(
    (popupId: string): string[] => {
      const popup = getPopupById(popupId);
      if (!popup || isDbId(popup.annotation.id)) return [];

      const selectedIds = viewerSettings.selectMultipleAnnotations
        ? (viewerApiRef.current?.getSelectedAnnotationIds?.() ?? [])
        : [];

      const draftIds = selectedIds.filter((id) => !isDbId(id));

      return draftIds.includes(popup.annotation.id) ? draftIds : [popup.annotation.id];
    },
    [getPopupById, viewerSettings.selectMultipleAnnotations]
  );

  const applyPopupIdentityToDraftAnnotation = React.useCallback(
    (annotation: A9sAnnotation, popupId: string): A9sAnnotation => {
      const popup = getPopupById(popupId);
      if (!popup) return annotation;

      const nextAllographId = popup.draftAllographId ?? undefined;
      const nextHandId = popup.draftHandId ?? undefined;
      const allographChanged = annotation._meta?.allographId !== nextAllographId;

      const remainingBodies = (annotation.body ?? []).filter(
        (body) => body.purpose !== 'commenting'
      );

      return {
        ...annotation,
        _meta: {
          ...annotation._meta,
          allographId: nextAllographId,
          handId: nextHandId,
          graphcomponentSet: allographChanged ? [] : (annotation._meta?.graphcomponentSet ?? []),
          positions: allographChanged ? [] : (annotation._meta?.positions ?? []),
          positionDetails: allographChanged ? [] : (annotation._meta?.positionDetails ?? []),
        },
        body: [
          ...(popup.draftAllographText.trim()
            ? [
                {
                  type: 'TextualBody',
                  purpose: 'commenting',
                  value: popup.draftAllographText.trim(),
                },
              ]
            : []),
          ...remainingBodies,
        ],
      };
    },
    [getPopupById]
  );

  const handleSaveDraftAnnotation = React.useCallback(
    async (popupId: string) => {
      const popup = getPopupById(popupId);
      if (!popup) return;

      const previousId = popup.annotation.id;

      const nextPositionDetails = popup.draftPositionIds
        .map((id) => {
          const name = positionNameById.get(id);
          return name ? { id, name } : null;
        })
        .filter((value): value is { id: number; name: string } => value !== null);

      const next: A9sAnnotation = {
        ...popup.annotation,
        _meta: {
          ...popup.annotation._meta,
          allographId: popup.draftAllographId ?? undefined,
          handId: popup.draftHandId ?? undefined,
          graphcomponentSet: popup.draftGraphcomponentSet,
          positions: popup.draftPositionIds,
          positionDetails: nextPositionDetails,
        },
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

      const currentAnnotations = viewerApiRef.current?.getAnnotations?.() ?? [];
      const latest =
        currentAnnotations.find((annotation) => annotation.id === next.id) ??
        currentAnnotations[currentAnnotations.length - 1] ??
        next;

      const latestWithMeta: A9sAnnotation = {
        ...latest,
        _meta: {
          ...latest._meta,
          ...next._meta,
        },
      };

      setEditorRecords((prev) => {
        const reconciled = { ...prev };

        if (latestWithMeta.id !== previousId) {
          delete reconciled[previousId];
        }

        return markAnnotationUpdated(reconciled, latestWithMeta);
      });

      const nextSnapshot = currentAnnotations.map((annotation) =>
        annotation.id === latestWithMeta.id ? latestWithMeta : annotation
      );

      setA9sSnapshot(nextSnapshot);
    },
    [getPopupById, positionNameById]
  );

  const handleConfirmDraftAnnotation = React.useCallback(
    async (popupId: string) => {
      const popup = getPopupById(popupId);
      if (!popup) return;

      const shouldResumeDraw =
        activeTool === 'draw' && Boolean(popup && !isDbId(popup.annotation.id));

      const isExistingStandard =
        isDbId(popup.annotation.id) && getAnnotationKind(popup.annotation) === 'public';

      if (isExistingStandard) {
        const next = buildStandardAnnotationFromPopup(popupId);
        if (!next) return;

        updatePopupById(popupId, { annotation: next as A9sWithMeta });

        setEditorRecords((prev) => markAnnotationUpdated(prev, next));

        setA9sSnapshot((prev) =>
          prev.map((annotation) => (annotation.id === next.id ? next : annotation))
        );

        setInitialA9sAnnots((prev) =>
          prev.map((annotation) => (annotation.id === next.id ? next : annotation))
        );

        removePopupById(popupId);

        viewerApiRef.current?.clearSelection?.();
        viewerApiRef.current?.enablePan();
        setActiveTool('move');
        return;
      }

      const selectedDraftIds = getSelectedDraftIdsForPopup(popupId);
      const activeDraftId = popup.annotation.id;

      await handleSaveDraftAnnotation(popupId);

      if (selectedDraftIds.length > 1) {
        const otherSelectedIds = selectedDraftIds.filter((id) => id !== activeDraftId);

        if (otherSelectedIds.length > 0) {
          const otherSelectedIdSet = new Set(otherSelectedIds);
          const currentAnnotations = viewerApiRef.current?.getAnnotations?.() ?? [];

          const nextAnnotations = currentAnnotations.map((annotation) => {
            if (!otherSelectedIdSet.has(annotation.id) || isDbId(annotation.id)) {
              return annotation;
            }

            return applyPopupIdentityToDraftAnnotation(annotation, popupId);
          });

          setInitialA9sAnnots(nextAnnotations);
          setA9sSnapshot(nextAnnotations);

          setEditorRecords((prev) => {
            let nextRecords = prev;

            nextAnnotations.forEach((annotation) => {
              if (otherSelectedIdSet.has(annotation.id)) {
                nextRecords = markAnnotationUpdated(nextRecords, annotation);
              }
            });

            return nextRecords;
          });
        }
      }

      removePopupById(popupId);
      viewerApiRef.current?.clearSelectedAnnotationIds?.();

      if (shouldResumeDraw) {
        rearmCreateTool();
      } else {
        viewerApiRef.current?.enablePan();
        setActiveTool('move');
      }
    },
    [
      activeTool,
      applyPopupIdentityToDraftAnnotation,
      buildStandardAnnotationFromPopup,
      getAnnotationKind,
      getPopupById,
      getSelectedDraftIdsForPopup,
      handleSaveDraftAnnotation,
      rearmCreateTool,
      removePopupById,
      updatePopupById,
    ]
  );

  const handleConfirmDelete = React.useCallback(
    (annotation: A9sAnnotation) => {
      const canonical = getCanonicalAnnotation(annotation);
      const kind = getAnnotationKind(canonical);
      const isDraft = !isDbId(canonical.id);

      return window.confirm(
        isDraft
          ? `Delete this ${kind} draft annotation?\n\nThis will discard it locally.`
          : `Delete this saved ${kind} annotation?\n\nThis will mark it for deletion. Press Save to persist the deletion.`
      );
    },
    [getCanonicalAnnotation, getAnnotationKind]
  );

  const handleConfirmDeleteMany = React.useCallback(
    (annotations: A9sAnnotation[]) => {
      const canonical = annotations.map((annotation) => getCanonicalAnnotation(annotation));
      const draftCount = canonical.filter((annotation) => !isDbId(annotation.id)).length;
      const savedCount = canonical.length - draftCount;

      const parts: string[] = [`Delete ${canonical.length} selected annotations?`];

      if (draftCount > 0 && savedCount > 0) {
        parts.push(
          '',
          `This will discard ${draftCount} draft annotation${draftCount === 1 ? '' : 's'} locally and mark ${savedCount} saved annotation${savedCount === 1 ? '' : 's'} for deletion.`,
          'Press Save to persist saved deletions.'
        );
      } else if (draftCount > 0) {
        parts.push(
          '',
          `This will discard ${draftCount} draft annotation${draftCount === 1 ? '' : 's'} locally.`
        );
      } else {
        parts.push(
          '',
          `This will mark ${savedCount} saved annotation${savedCount === 1 ? '' : 's'} for deletion.`,
          'Press Save to persist the deletion.'
        );
      }

      return window.confirm(parts.join('\n'));
    },
    [getCanonicalAnnotation]
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
    setActiveTool('move');
    setA9sSnapshot(api.getAnnotations?.() ?? []);
  }, []);

  const handleMoveTool = () => {
    viewerApiRef.current?.enablePan();
    setActiveTool('move');
  };

  const handleCreateAnnotation = (kind?: AnnotationCreationKind) => {
    const nextKind = kind ?? getDefaultAnnotationCreationKind(viewerCapabilities);
    if (!nextKind) return;
    if (!canCreateAnnotationKind(viewerCapabilities, nextKind)) return;

    setCurrentCreationKind(nextKind);
    viewerApiRef.current?.enableDraw();
    setActiveTool('draw');
  };

  const handleDeleteTool = () => {
    if (!canDeleteAnnotations) return;

    viewerApiRef.current?.enableDelete();
    setActiveTool('delete');
  };

  const handleSave = React.useCallback(async (): Promise<void> => {
    if (!canPersistAnyAnnotations || !manuscriptImage) return;

    if (!token) {
      window.alert('Please log in again before saving annotations.');
      return;
    }

    try {
      const upsertRecords = Object.values(editorRecords).filter((record) => {
        if (record.dirtyState !== 'created' && record.dirtyState !== 'updated') {
          return false;
        }

        return canPersistAnnotationKind(viewerCapabilities, getAnnotationKind(record.annotation));
      });

      const deleteRecords = Object.values(editorRecords).filter(
        (record) => record.dirtyState === 'deleted' && record.source === 'persisted'
      );

      const validationError = upsertRecords
        .map((record) => getStandardSaveValidationError(record.annotation))
        .find((message): message is string => Boolean(message));

      if (validationError) {
        window.alert(validationError);
        return;
      }

      const tasks: Promise<unknown>[] = [];

      for (const record of upsertRecords) {
        const annotation = record.annotation;
        const feature = a9sToBackendFeature(annotation, imageHeight);

        const positionsPayload = annotation._meta?.positions ?? [];
        const graphcomponentPayload = (annotation._meta?.graphcomponentSet ?? []).map((item) => ({
          component: item.component,
          features: item.features ?? [],
        }));

        if (record.source === 'persisted' && isDbAnnotation(annotation)) {
          const id = dbIdFromA9s(annotation);
          if (id != null) {
            tasks.push(
              updateViewerAnnotation(token, id, {
                annotation: feature,
                allograph: annotation._meta?.allographId ?? 0,
                hand: annotation._meta?.handId ?? 0,
                positions: positionsPayload,
                graphcomponent_set: graphcomponentPayload,
              })
            );
          }
          continue;
        }

        tasks.push(
          createViewerAnnotation(token, {
            item_image: Number(manuscriptImage.id),
            annotation: feature,
            allograph: annotation._meta?.allographId ?? 0,
            hand: annotation._meta?.handId ?? 0,
            positions: positionsPayload,
            graphcomponent_set: graphcomponentPayload,
          })
        );
      }

      for (const record of deleteRecords) {
        const id = dbIdFromA9s(record.annotation);
        if (id != null) {
          tasks.push(deleteViewerAnnotation(token, id));
        }
      }

      await Promise.all(tasks);

      const refreshed = await fetchAnnotationsForImage(String(manuscriptImage.id));
      const mapped = refreshed.map((annotation) =>
        backendToA9sAnnotation(annotation, imageHeight, allographNameById.get(annotation.allograph))
      );

      viewerApiRef.current?.clearSelection?.();
      clearPopupCollection();

      setInitialA9sAnnots(mapped);
      setA9sSnapshot(mapped);
      setEditorRecords(buildHydratedEditorRecordMap(mapped));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save annotations.';
      window.alert(message);
    }
  }, [
    allographNameById,
    canPersistAnyAnnotations,
    clearPopupCollection,
    editorRecords,
    getAnnotationKind,
    getStandardSaveValidationError,
    imageHeight,
    manuscriptImage,
    token,
    viewerCapabilities,
  ]);

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

  const handleAllographDialogOpenChange = React.useCallback(
    (open: boolean) => {
      setIsAllographModalOpen(open);
      if (!open) {
        allographDialogDrag.reset();
      }
    },
    [allographDialogDrag]
  );

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
    if (!canUseSettings) return;

    setIsSettingsPanelOpen((prev) => {
      const next = !prev;
      if (!next) settingsPanelDrag.reset();
      return next;
    });
  }, [canUseSettings, settingsPanelDrag]);

  const handleSelectAnnotationFromViewer = React.useCallback(
    (annotation: A9sAnnotation | null) => {
      cancelPendingPopupClear();

      const selected = annotation ? getCanonicalAnnotation(annotation) : null;

      if (selected) {
        openSinglePopupFromAnnotation(selected, { clearHover: true });
        return;
      }

      pendingPopupClearRef.current = window.setTimeout(() => {
        pendingPopupClearRef.current = null;
        clearSinglePopupState({ clearHover: true });
      }, 50);
    },
    [
      cancelPendingPopupClear,
      clearSinglePopupState,
      getCanonicalAnnotation,
      openSinglePopupFromAnnotation,
    ]
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

  // ---- Effects ----

  React.useEffect(() => {
    if (canCreateAnnotationKind(viewerCapabilities, currentCreationKind)) return;

    const fallbackKind = getDefaultAnnotationCreationKind(viewerCapabilities);
    if (fallbackKind) {
      setCurrentCreationKind(fallbackKind);
    }
  }, [viewerCapabilities, currentCreationKind]);

  React.useEffect(() => {
    setHands([]);
    setHandsLoaded(false);
    setSelectedHand(undefined);
    setEditorRecords({});
    setSelectedAnnotationIds([]);

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
          setEditorRecords(buildHydratedEditorRecordMap(merged));
        }
      } catch {
        if (isMounted) {
          setInitialA9sAnnots([]);
          setA9sSnapshot([]);
          setEditorRecords({});
        }
      }
    };

    void load();

    return () => {
      isMounted = false;
    };
  }, [manuscriptImage, imageHeight, allographNameById, isPublicDemoMode]);

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
      selectedAnnotationsCount={selectedAnnotationIds.length}
      showUnsavedCount={canPersistAnyAnnotations}
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
      onOpenSettingsPanel={canUseSettings ? toggleSettingsPanel : undefined}
      isSettingsActive={canUseSettings ? isSettingsPanelOpen : false}
      showSettingsButton={canUseSettings}
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
        showEditorialToggle={canViewEditorialControls}
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
        showEditorSettings={canUseEditorSettings}
        onClose={handleCloseSettingsPanel}
        onToggleAllowMultipleBoxes={handleToggleAllowMultipleBoxes}
        onToggleSelectMultipleAnnotations={handleToggleSelectMultipleAnnotations}
        onSetToolbarPosition={handleSetToolbarPosition}
      />

      <AllographGalleryDialog
        open={isAllographModalOpen}
        onOpenChange={handleAllographDialogOpenChange}
        transform={`translate(calc(-50% + ${allographDialogDrag.pos.x}px), calc(-50% + ${allographDialogDrag.pos.y}px))`}
        dragHandleProps={allographDialogDrag.bindDrag}
        activeAllographLabel={activeAllographLabel}
        activeHandLabel={activeHandLabel}
        annotations={filteredA9s}
        iiifImage={manuscriptImage?.iiif_image ?? null}
        onAnnotationHover={setHoveredAnnotationId}
        onAnnotationClick={(annotationId) => {
          viewerApiRef.current?.centerOnAnnotation?.(annotationId);
        }}
      />

      <div className={`relative flex flex-1 ${isFullScreen ? 'mt-20' : ''}`}>
        <div
          className={
            isFullScreen ? 'flex flex-1 overflow-hidden p-0' : 'flex flex-1 overflow-hidden p-4'
          }
        >
          <div
            className={
              isFullScreen
                ? 'relative h-full w-full overflow-hidden rounded-lg border bg-accent/50'
                : 'relative h-[calc(100%-3rem)] w-full overflow-hidden rounded-lg border bg-accent/50'
            }
          >
            <Toolbar orientation={viewerSettings.toolbarPosition}>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => viewerApiRef.current?.goHome()}
                    >
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
                  <TooltipContent>
                    {isFullScreen ? 'Exit Full Screen' : 'Full Screen'}
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => viewerApiRef.current?.zoomIn()}
                    >
                      <ZoomIn className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Zoom In</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => viewerApiRef.current?.zoomOut()}
                    >
                      <ZoomOut className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Zoom Out</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={activeTool === 'move' ? 'default' : 'ghost'}
                      size="icon"
                      onClick={handleMoveTool}
                    >
                      <Hand className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Move Tool (m)</TooltipContent>
                </Tooltip>

                {canCreatePublicAnnotations && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant={
                          activeTool === 'draw' && currentCreationKind === 'public'
                            ? 'default'
                            : 'ghost'
                        }
                        size="icon"
                        onClick={() => handleCreateAnnotation('public')}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {canCreateEditorialAnnotations
                        ? 'Create Annotation'
                        : 'Create Public Annotation'}
                    </TooltipContent>
                  </Tooltip>
                )}

                {canCreateEditorialAnnotations && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant={
                          activeTool === 'draw' && currentCreationKind === 'editorial'
                            ? 'default'
                            : 'ghost'
                        }
                        size="icon"
                        onClick={() => handleCreateAnnotation('editorial')}
                      >
                        <SquarePen className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Create Editorial Annotation</TooltipContent>
                  </Tooltip>
                )}

                {canPersistAnyAnnotations && (
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
                )}

                {canDeleteAnnotations && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant={activeTool === 'delete' ? 'default' : 'ghost'}
                        size="icon"
                        onClick={handleDeleteTool}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Delete (del)</TooltipContent>
                  </Tooltip>
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

            <ManuscriptAnnotorious
              iiifImageUrl={browserSafeIiifUrl(getIiifBaseUrl(manuscriptImage.iiif_image))}
              initialAnnotations={initialA9sAnnots}
              annotationFilter={annotationVisibilityFilter}
              disableEditor={true}
              readOnly={false}
              allowMultipleSelection={viewerSettings.selectMultipleAnnotations}
              onSelectionIdsChange={setSelectedAnnotationIds}
              onCreate={handleViewerCreate}
              onDelete={(annotation: A9sAnnotation) => {
                setEditorRecords((prev) => markAnnotationDeleted(prev, annotation.id));

                const currentAnnotations = viewerApiRef.current?.getAnnotations?.() ?? [];
                setInitialA9sAnnots(currentAnnotations);
                setA9sSnapshot(currentAnnotations);

                removePopupById(annotation.id);
              }}
              confirmDelete={handleConfirmDelete}
              confirmDeleteMany={handleConfirmDeleteMany}
              onSelect={handleSelectAnnotationFromViewer}
              exposeApi={handleExposeApi}
            />

            {visiblePopupRecords.map((popupRecord, index) => {
              const popupCard = getPopupCardViewData(popupRecord, allographNameById);
              const popupCapabilities = getPopupCapabilities(popupRecord, viewerCapabilities);
              const popupEditorMode = getPopupEditorMode(popupRecord, popupCapabilities);
              const annotationKind = getAnnotationKindFromPopupRecord(popupRecord);
              const metaSummary = getPopupMetaSummary(popupRecord, allographNameById, handNameById);
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
                      annotationKind={annotationKind}
                      popupCapabilities={popupCapabilities}
                      popupEditorMode={popupEditorMode}
                      draftInternalNoteText={popupRecord.draftInternalNoteText}
                      draftPublicNoteText={popupRecord.draftPublicNoteText}
                      onDraftInternalNoteTextChange={(value) =>
                        handleDraftInternalNoteTextChange(popupRecord.id, value)
                      }
                      onDraftPublicNoteTextChange={(value) =>
                        handleDraftPublicNoteTextChange(popupRecord.id, value)
                      }
                      metaSummary={metaSummary}
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
                      allographOptions={allographs}
                      handOptions={hands.map((hand) => ({
                        id: hand.id,
                        name: hand.name,
                      }))}
                      draftAllographId={popupRecord.draftAllographId}
                      draftHandId={popupRecord.draftHandId}
                      draftGraphcomponentSet={popupRecord.draftGraphcomponentSet}
                      draftPositionIds={popupRecord.draftPositionIds}
                      onDraftPositionIdsChange={(value) =>
                        handleDraftPositionIdsChange(popupRecord.id, value)
                      }
                      onDraftGraphcomponentSetChange={(value) =>
                        handleDraftGraphcomponentSetChange(popupRecord.id, value)
                      }
                      onDraftAllographIdChange={(value) =>
                        void handleDraftAllographIdChange(popupRecord.id, value)
                      }
                      onDraftHandIdChange={(value) =>
                        void handleDraftHandIdChange(popupRecord.id, value)
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
