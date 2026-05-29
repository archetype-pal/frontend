'use client';

import * as React from 'react';
import dynamic from 'next/dynamic';

import { useAuth } from '@/contexts/auth-context';

import { getIiifBaseUrl } from '@/utils/iiif';
import { AnnotationFilterPanel } from './annotation-filter-panel';
import { AnnotationSettingsPanel } from './annotation-settings-panel';
import { AllographGalleryDialog } from './allograph-gallery-dialog';
import { dismissActionNotification, showActionNotification } from '@/components/ui/action-toast';
import { AnnotationHeader } from '@/components/annotation/annotation-header';
import { AnnotationPopupLayer } from '@/components/annotation/annotation-popup-layer';
import {
  fetchImageTextsForImage,
  linkRegionToElement,
  type ImageTextDetail,
} from '@/services/image-texts';
import { ViewerTextPanel } from './viewer-text-panel';
import { ImageToolsControl } from './image-tools-control';
import { LightboxControl } from './lightbox-control';
import { ViewerErrorState, ViewerLoadingState } from './viewer-status-screen';
import { ViewerToolbar } from './viewer-toolbar';
import { a9sToBackendFeature, dbIdFromA9s } from '@/lib/anno-mapping';

import {
  canCreateAnnotationKind,
  canPersistAnnotationKind,
  getDefaultAnnotationCreationKind,
  getViewerCapabilities,
} from '@/lib/viewer-capabilities';

import type { ViewerApi, Annotation as A9sAnnotation } from './manuscript-annotorious';
import type {
  A9sWithMeta,
  DraftSharePayload,
  ViewerCapabilities,
  ViewerMode,
  AnnotationCreationKind,
  PopupRecord,
} from '@/types/annotation-viewer';

import {
  browserSafeIiifUrl,
  decodeDraftSharePayload,
  encodeDraftSharePayload,
  isDbId,
} from '@/lib/annotation-popup-utils';
import {
  buildStandardAnnotationBody,
  getAllographBodyText,
  getEditorialInternalNote,
  getStandardAnnotationNote,
} from '@/lib/annotation-notes';

import {
  buildPopupAnnotationPayload,
  getPopupCardViewData,
} from '@/lib/manuscript-viewer-popup-utils';

import { buildInitialViewerAnnotations } from '@/lib/manuscript-viewer-annotations';
import { annotationCountLabel } from '@/lib/manuscript-viewer-collection';
import { formatAllographLabel } from '@/lib/allograph-labels';
import { getDefaultHand, sortHandsByPriority } from '@/lib/hand-ordering';

import { useAnnotationEditorState } from '@/hooks/use-annotation-editor-state';
import { useAnnotationNotifications } from '@/hooks/manuscript/use-annotation-notifications';
import { useViewerEditorUiState } from '@/hooks/use-viewer-editor-ui-state';

import { useManuscriptPopups } from '@/hooks/use-manuscript-popups';
import { useDraftPopupBuilders } from '@/hooks/manuscript/use-draft-popup-builders';
import { useAnnotationVisibilityToggle } from '@/hooks/manuscript/use-annotation-visibility-toggle';
import { useViewerOsdSync } from '@/hooks/manuscript/use-viewer-osd-sync';
import { useCollectionActions } from '@/hooks/manuscript/use-collection-actions';
import { useViewerBaseData } from '@/hooks/manuscript/use-viewer-base-data';
import { useAnnotationVisibilityFilters } from '@/hooks/manuscript/use-annotation-visibility-filters';
import { describeSaveOutcome } from '@/lib/manuscript-viewer-save';
import { usePendingPopupClear } from '@/hooks/manuscript/use-pending-popup-clear';
import { useDraggablePosition } from '@/hooks/use-draggable-position';
import { useAnnotationViewerSettings } from '@/hooks/use-annotation-viewer-settings';
import { useViewerImageToolsControls } from '@/hooks/manuscript/use-viewer-image-tools-controls';
import { useViewerChromeState } from '@/hooks/use-viewer-chrome-state';
import { useHotkeys, type HotkeyDefinition } from '@/hooks/use-hotkeys';

const ManuscriptAnnotorious = dynamic(() => import('./manuscript-annotorious'), { ssr: false });
const ANNOTATION_SELECTION_TOAST_ID = 'annotation-selection-toast';
const LEGACY_SHORTCUT_PAN_STEP = 60;

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
  const {
    manuscriptImage,
    manuscript,
    allographs,
    imageAllographIds,
    hands,
    handsLoaded,
    imageHeight,
    loading,
    error,
    setHands,
    setHandsLoaded,
  } = useViewerBaseData(imageId);

  const viewerApiRef = React.useRef<ViewerApi | null>(null);
  const [osdReady, setOsdReady] = React.useState(false);

  const [initialA9sAnnots, setInitialA9sAnnots] = React.useState<A9sAnnotation[]>([]);
  const [selectedAnnotationIds, setSelectedAnnotationIds] = React.useState<string[]>([]);

  // Text↔region linking: the image-texts for this image, whether the side
  // panel is shown, and the Graph id of the region currently selected on the
  // image (drives the span highlight in the panel).
  const [imageTexts, setImageTexts] = React.useState<ImageTextDetail[]>([]);
  const [isTextPanelOpen, setIsTextPanelOpen] = React.useState(false);
  const [linkedGraphId, setLinkedGraphId] = React.useState<number | null>(null);
  // Track A — draw-to-link: when an editor arms an unlinked phrase, the next
  // drawn region is sent to the link-region endpoint instead of becoming a
  // normal draft.
  const [linkArm, setLinkArm] = React.useState<{
    textId: number;
    elementIndex: number;
    label: string;
  } | null>(null);
  const linkArmRef = React.useRef<typeof linkArm>(null);
  React.useEffect(() => {
    linkArmRef.current = linkArm;
  }, [linkArm]);

  const {
    imageAdjustments,
    hasImageToolChanges,
    handleRotateViewer,
    handleImageAdjustmentChange,
    handleResetImageTools,
    resetImageAdjustments,
  } = useViewerImageToolsControls({ viewerApiRef, osdReady });

  const { annotationsEnabled, toggleAnnotations } = useAnnotationVisibilityToggle({
    imageId,
    osdReady,
    viewerApiRef,
  });

  const initialGraphHandledRef = React.useRef(false);
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

  // ---- Overlay chrome (fullscreen + drawer panels) ----
  const {
    isFullScreen,
    isFilterPanelOpen,
    isSettingsPanelOpen,
    toggleFullScreen,
    toggleFilterPanel,
    toggleSettingsPanel,
    closeFilterPanel,
    closeSettingsPanel,
  } = useViewerChromeState({ filterPanelDrag, settingsPanelDrag, canUseSettings });

  // ---- Derived values ----
  const popupAnnotation = activePopupRecord?.annotation ?? null;

  const popupSelectedAllograph = React.useMemo(() => {
    const allographId = popupAnnotation?._meta?.allographId;
    if (allographId == null) return undefined;
    return allographs.find((a) => a.id === allographId);
  }, [allographs, popupAnnotation]);

  const allographNameById = React.useMemo(
    () => new Map(allographs.map((a) => [a.id, a.name])),
    [allographs]
  );

  // Phase A.1 — annotation editor state lives in a dedicated hook.
  // Owns: editorRecords, the per-frame update debounce, save flow.
  // Returns derived a9sSnapshot, dirtyCount, isDirty, getCanonicalAnnotation.
  const editorState = useAnnotationEditorState({
    token,
    manuscriptImage,
    imageHeight,
    allographNameById,
    viewerCapabilities,
    canViewEditorialControls,
    canPersistAnnotationKind,
  });
  const {
    editorRecords,
    a9sSnapshot,
    getCanonicalAnnotation,
    resetFrom: resetEditorFrom,
  } = editorState;

  const unsavedChanges = editorState.dirtyCount;

  const {
    isInCollection,
    pageCollectionItem,
    isPageInCollection,
    pageAnnotationCollectionItems,
    getCollectionItemFor,
    handleTogglePageCollection,
    handleCreateAnnotationCollection,
    handleToggleAnnotationCollection,
  } = useCollectionActions({ manuscript, manuscriptImage, imageHeight, editorRecords });

  const allographLabelById = React.useMemo(
    () => new Map(allographs.map((a) => [a.id, formatAllographLabel(a)])),
    [allographs]
  );
  const handsForThisImage = React.useMemo(() => sortHandsByPriority(hands), [hands]);

  const handNameById = React.useMemo(
    () => new Map(handsForThisImage.map((hand) => [hand.id, hand.name])),
    [handsForThisImage]
  );

  const positionNameById = React.useMemo(() => {
    const entries = allographs.flatMap((allograph) =>
      (allograph.positions ?? []).map((position) => [position.id, position.name] as const)
    );

    return new Map<number, string>(entries);
  }, [allographs]);

  // Phase A.2 — editor-side transient UI state (active tool, creation kind,
  // allograph picker, hand selection, hovered annotation) + the three
  // invariants that gate them (capability-kind fallback, hand reset on
  // image change, modal auto-close when no context allograph).
  const editorUi = useViewerEditorUiState({
    viewerCapabilities,
    handsForThisImage,
    popupSelectedAllograph,
    onAllographModalAutoClose: React.useCallback(
      () => allographDialogDrag.reset(),
      [allographDialogDrag]
    ),
  });
  const {
    activeTool,
    setActiveTool,
    currentCreationKind,
    setCurrentCreationKind,
    filteredAllograph,
    setFilteredAllograph,
    hoveredAllograph,
    setHoveredAllograph,
    isAllographModalOpen,
    setIsAllographModalOpen,
    selectedHand,
    setSelectedHand,
    hoveredAnnotationId,
    setHoveredAnnotationId,
  } = editorUi;

  const defaultHand = React.useMemo(() => getDefaultHand(handsForThisImage), [handsForThisImage]);
  const activeAssignmentHand =
    selectedHand === undefined ? defaultHand : (selectedHand ?? undefined);
  const activeHandLabel = activeAssignmentHand?.name ?? 'Any';

  const dropdownAllograph = filteredAllograph ?? popupSelectedAllograph ?? undefined;

  const displayAllograph =
    hoveredAllograph ?? filteredAllograph ?? popupSelectedAllograph ?? undefined;

  const activeAllographLabel = displayAllograph
    ? formatAllographLabel(displayAllograph)
    : undefined;

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
    if (highlightAllographId != null) {
      return a9sSnapshot
        .filter(
          (a) =>
            (a as A9sWithMeta)._meta?.allographId === highlightAllographId &&
            a.id !== popupAnnotation?.id
        )
        .map((a) => a.id);
    }

    if (selectedHand?.id != null) {
      return a9sSnapshot
        .filter(
          (a) =>
            (a as A9sWithMeta)._meta?.handId === selectedHand.id && a.id !== popupAnnotation?.id
        )
        .map((a) => a.id);
    }

    return [];
  }, [a9sSnapshot, highlightAllographId, popupAnnotation?.id, selectedHand?.id]);

  useViewerOsdSync({
    osdReady,
    viewerApiRef,
    hoveredAnnotationId,
    highlightAllographId,
    highlightedIds,
  });

  const allographsForThisImage = React.useMemo(() => {
    if (!allographs.length) return [];

    if (!imageAllographIds.length) return allographs;

    const idSet = new Set(imageAllographIds);
    return allographs.filter((a) => idSet.has(a.id));
  }, [allographs, imageAllographIds]);

  const availableAllographFilterIds = React.useMemo(
    () => allographsForThisImage.map((allograph) => allograph.id),
    [allographsForThisImage]
  );

  const availableHandFilterIds = React.useMemo(
    () => handsForThisImage.map((hand) => hand.id),
    [handsForThisImage]
  );

  const {
    visibilityFilters,
    isVisibilityFilterActive,
    annotationVisibilityFilter,
    handleToggleAllographFilter,
    handleToggleHandFilter,
    handleToggleAllAllographFilters,
    handleToggleAllHandFilters,
    handleToggleEditorialVisibility,
    handleTogglePublicAnnotationsVisibility,
  } = useAnnotationVisibilityFilters({
    imageId,
    availableAllographFilterIds,
    availableHandFilterIds,
    a9sSnapshotLength: a9sSnapshot.length,
    baseDataReady: Boolean(manuscriptImage && imageHeight),
    handsLoaded,
    isTextPanelOpen,
    canViewEditorialControls,
    getCanonicalAnnotation,
  });

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
        return null;
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

  const { notifyLocalAnnotationUpdate, notifyLocalAnnotationCreate, notifyDeletedAnnotations } =
    useAnnotationNotifications({ canPersistAnyAnnotations, getCanonicalAnnotation });

  const handleSelectionIdsChange = React.useCallback(
    (ids: string[]) => {
      setSelectedAnnotationIds(ids);

      if (!viewerSettings.selectMultipleAnnotations) return;

      if (ids.length === 0) {
        dismissActionNotification(ANNOTATION_SELECTION_TOAST_ID);
        return;
      }

      showActionNotification({
        kind: 'selected',
        title: `${annotationCountLabel(ids.length)} selected`,
        description: 'Selection updated.',
        duration: 1800,
      });
    },
    [viewerSettings.selectMultipleAnnotations]
  );

  const decorateCreatedAnnotation = React.useCallback(
    (annotation: A9sAnnotation): A9sWithMeta => {
      return {
        ...annotation,
        _meta: {
          ...annotation._meta,
          allographId: filteredAllograph?.id ?? annotation._meta?.allographId,
          handId: annotation._meta?.handId ?? activeAssignmentHand?.id,
          annotationType: currentCreationKind,
        },
      } as A9sWithMeta;
    },
    [filteredAllograph?.id, activeAssignmentHand?.id, currentCreationKind]
  );

  // Reload image-texts + re-seed annotations after a server-side change
  // (used by the link-region flow so the new region + corresp appear).
  const reloadTextsAndAnnotations = React.useCallback(async () => {
    if (!manuscriptImage || !imageHeight) return;
    const [texts, refreshed] = await Promise.all([
      fetchImageTextsForImage(imageId, token).catch(() => null),
      buildInitialViewerAnnotations({
        itemImageId: String(manuscriptImage.id),
        iiifImage: manuscriptImage.iiif_image,
        imageHeight,
        allographNameById,
        isPublicDemoMode,
        includeEditorial: canViewEditorialControls,
        includeText: true,
        token,
        // Preserve any in-progress local drafts across the post-link reseed
        // (the merge keeps non-db drafts; passing [] would silently drop them).
        currentViewerAnnotations: viewerApiRef.current?.getAnnotations?.() ?? [],
        currentUrl: '',
      }).catch(() => null),
    ]);
    if (texts) setImageTexts(texts);
    if (refreshed) {
      setInitialA9sAnnots(refreshed);
      editorState.resetFrom(refreshed);
    }
  }, [
    manuscriptImage,
    imageHeight,
    imageId,
    token,
    allographNameById,
    isPublicDemoMode,
    canViewEditorialControls,
    editorState,
  ]);

  const handleViewerCreate = React.useCallback(
    (annotation: A9sAnnotation) => {
      // Track A — if a phrase is armed for linking, the drawn polygon becomes a
      // server-side TEXT graph linked to that element rather than a local draft.
      const arm = linkArmRef.current;
      if (arm && token && imageHeight) {
        const geometry = a9sToBackendFeature(annotation, imageHeight);
        void (async () => {
          try {
            await linkRegionToElement(token, arm.textId, arm.elementIndex, geometry);
            viewerApiRef.current?.removeAnnotationById?.(annotation.id);
            setLinkArm(null);
            await reloadTextsAndAnnotations();
            showActionNotification({
              kind: 'created',
              title: 'Region linked',
              description: `Linked a region to “${arm.label}”.`,
              duration: 2200,
            });
          } catch (error) {
            viewerApiRef.current?.removeAnnotationById?.(annotation.id);
            showActionNotification({
              kind: 'error',
              title: 'Link failed',
              description:
                error instanceof Error ? error.message.slice(0, 160) : 'Could not link region.',
            });
          }
        })();
        return;
      }

      const enriched = decorateCreatedAnnotation(annotation);

      const syncCreatedAnnotation = async () => {
        await viewerApiRef.current?.updateSelectedDraft?.(enriched);

        updatePopupById(enriched.id, { annotation: enriched });
        editorState.markCreated(enriched);
      };

      void syncCreatedAnnotation();
    },
    [
      decorateCreatedAnnotation,
      updatePopupById,
      editorState,
      token,
      imageHeight,
      reloadTextsAndAnnotations,
    ]
  );

  // The per-frame Annotorious update coalescing buffer + flush-on-unmount
  // live in useAnnotationEditorState. Forward the OSD modify-drag event
  // to the hook with debounced=true so 60 fps pointermove fires collapse
  // into one state commit on the trailing edge.
  const handleViewerUpdate = React.useCallback(
    (annotation: A9sAnnotation) => {
      editorState.markUpdated(annotation, { debounced: true });
    },
    [editorState]
  );

  const clearSinglePopupState = React.useCallback(
    (options?: { clearHover?: boolean }) => {
      clearPopupCollection();

      if (options?.clearHover) {
        setHoveredAnnotationId(null);
      }
    },
    [clearPopupCollection, setHoveredAnnotationId]
  );

  const { schedulePopupClear, cancelPendingPopupClear } = usePendingPopupClear(() =>
    clearSinglePopupState({ clearHover: true })
  );

  const handlePopupTabChange = React.useCallback(
    (popupId: string, value: PopupRecord['popupTab']) => {
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

  // Trivial draft-field handlers (text, note, internal note, positions,
  // graphcomponentSet) moved into AnnotationPopupLayer where they're
  // inlined via updatePopupById. Only the non-trivial cascade — change
  // allograph clears related fields — stays here.

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
                allographId: annotation._meta?.allographId ?? filteredAllograph?.id,
                handId: annotation._meta?.handId ?? activeAssignmentHand?.id,
                annotationType: annotation._meta?.annotationType ?? currentCreationKind,
              },
            } as A9sWithMeta)
          : annotation;

      const defaultPopupTab: PopupRecord['popupTab'] =
        annotationForPopup._meta?.annotationType !== 'editorial' && canViewEditorialControls
          ? 'details'
          : 'components';

      const commonOverrides = {
        popupTab: defaultPopupTab,
        shareUrl: '',
        isShareUrlVisible: false,
        draftAllographText: getAllographBodyText(annotationForPopup),
        draftNoteText: getStandardAnnotationNote(annotationForPopup),
        draftAllographId: annotationForPopup._meta?.allographId ?? null,
        draftHandId: annotationForPopup._meta?.handId ?? null,
        draftInternalNoteText: getEditorialInternalNote(annotationForPopup),
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
      canViewEditorialControls,
      clearSinglePopupState,
      currentCreationKind,
      filteredAllograph?.id,
      openPopupCollectionFromAnnotation,
      activeAssignmentHand?.id,
      viewerSettings.allowMultipleBoxes,
      setFilteredAllograph,
      setHoveredAnnotationId,
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
        const draftBody: A9sAnnotation['body'] =
          getAnnotationKind(popup.annotation) === 'editorial'
            ? []
            : buildStandardAnnotationBody(popup.draftAllographText, popup.draftNoteText);

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
    [getAnnotationKind, getPopupById, updatePopupById]
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
  }, [setActiveTool]);

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
    [
      activeTool,
      cancelPendingPopupClear,
      getPopupById,
      removePopupById,
      rearmCreateTool,
      setActiveTool,
    ]
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

  const {
    buildStandardAnnotationFromPopup,
    buildEditorialAnnotationFromPopup,
    getSelectedDraftIdsForPopup,
    applyPopupValuesToDraftAnnotationFromRecord,
  } = useDraftPopupBuilders({
    getPopupById,
    positionNameById,
    selectMultipleAnnotations: viewerSettings.selectMultipleAnnotations,
    viewerApiRef,
  });

  const handleSaveDraftAnnotation = React.useCallback(
    async (popupId: string) => {
      const popup = getPopupById(popupId);
      if (!popup) return;

      const previousId = popup.annotation.id;
      const isEditorial = getAnnotationKind(popup.annotation) === 'editorial';

      const next = buildPopupAnnotationPayload({
        popup,
        isEditorial,
        positionNameById,
      });

      await viewerApiRef.current?.updateSelectedDraft?.(next);

      // Capture ids just before save so we can identify the saved annotation
      // if Annotorious replaces the draft id with a persisted one. Going by
      // "last item in the post-save array" — the previous behaviour — picked
      // whatever was drawn last in bulk-draw mode, not the one being saved.
      const idsBeforeSave = new Set(
        (viewerApiRef.current?.getAnnotations?.() ?? []).map((a) => a.id)
      );

      await viewerApiRef.current?.saveSelectedDraft?.();

      const currentAnnotations = viewerApiRef.current?.getAnnotations?.() ?? [];
      const latest =
        currentAnnotations.find((annotation) => annotation.id === next.id) ??
        currentAnnotations.find((annotation) => !idsBeforeSave.has(annotation.id)) ??
        next;

      const latestWithMeta: A9sAnnotation = {
        ...latest,
        _meta: {
          ...latest._meta,
          ...next._meta,
        },
      };

      editorState.replaceLocalAnnotation(previousId, latestWithMeta);
    },
    [getAnnotationKind, getPopupById, positionNameById, editorState]
  );

  const handleConfirmDraftAnnotation = React.useCallback(
    async (popupId: string) => {
      const popup = getPopupById(popupId);
      if (!popup) return;

      const shouldResumeDraw =
        activeTool === 'draw' && Boolean(popup && !isDbId(popup.annotation.id));

      const isExistingStandard =
        isDbId(popup.annotation.id) && getAnnotationKind(popup.annotation) === 'public';
      const isExistingEditorial =
        isDbId(popup.annotation.id) && getAnnotationKind(popup.annotation) === 'editorial';

      if (isExistingStandard || isExistingEditorial) {
        const next = isExistingEditorial
          ? buildEditorialAnnotationFromPopup(popupId)
          : buildStandardAnnotationFromPopup(popupId);
        if (!next) return;

        updatePopupById(popupId, { annotation: next as A9sWithMeta });

        editorState.markUpdated(next);
        // Annotorious keeps the polygon shape locally; only _meta changed.
        // The next select event recovers canonical metadata via
        // editorState.getCanonicalAnnotation, so no OSD re-seed needed.

        removePopupById(popupId);

        viewerApiRef.current?.clearSelection?.();
        viewerApiRef.current?.enablePan();
        setActiveTool('move');
        notifyLocalAnnotationUpdate(1);
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

          // Use the popup captured at the top of this callback — by now
          // handleSaveDraftAnnotation has fired createAnnotation events and
          // the popup at popupId may already have been evicted, so looking
          // it up again by id would silently drop the bulk-apply values.
          const nextAnnotations = currentAnnotations.map((annotation) => {
            if (!otherSelectedIdSet.has(annotation.id) || isDbId(annotation.id)) {
              return annotation;
            }

            return applyPopupValuesToDraftAnnotationFromRecord(annotation, popup);
          });

          // Snapshot derives from editorRecords; only the records map
          // needs updating. We don't re-seed Annotorious — its internal
          // state for these polygons is unchanged (only _meta differs).
          editorState.markManyUpdated(nextAnnotations.filter((a) => otherSelectedIdSet.has(a.id)));
        }
      }

      removePopupById(popupId);
      viewerApiRef.current?.clearSelectedAnnotationIds?.();
      notifyLocalAnnotationCreate(selectedDraftIds.length);

      if (shouldResumeDraw) {
        rearmCreateTool();
      } else {
        viewerApiRef.current?.enablePan();
        setActiveTool('move');
      }
    },
    [
      activeTool,
      buildEditorialAnnotationFromPopup,
      applyPopupValuesToDraftAnnotationFromRecord,
      buildStandardAnnotationFromPopup,
      getAnnotationKind,
      getPopupById,
      getSelectedDraftIdsForPopup,
      handleSaveDraftAnnotation,
      notifyLocalAnnotationCreate,
      notifyLocalAnnotationUpdate,
      rearmCreateTool,
      removePopupById,
      updatePopupById,
      editorState,
      setActiveTool,
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

  const handleViewerDelete = React.useCallback(
    (annotation: A9sAnnotation, context?: { bulk: boolean }) => {
      // markDeleted handles both draft (removed outright) and persisted
      // (marked isDeleted=true) cases. The derived a9sSnapshot filters
      // out isDeleted records, matching what Annotorious already did
      // locally when it fired the delete event. We deliberately do NOT
      // touch initialA9sAnnots — bumping that prop re-seeds the OSD
      // layer and drops in-flight selection / mid-draw polygons.
      editorState.markDeleted(annotation.id);

      removePopupById(annotation.id);

      if (!context?.bulk) {
        notifyDeletedAnnotations([annotation]);
      }
    },
    [notifyDeletedAnnotations, removePopupById, editorState]
  );

  const handleDeletePopupAnnotation = React.useCallback(
    (popupId: string) => {
      if (!canDeleteAnnotations) return;

      const popup = getPopupById(popupId);
      if (!popup) return;

      const annotation = getCanonicalAnnotation(popup.annotation);
      const confirmed = handleConfirmDelete(annotation);
      if (!confirmed) return;

      viewerApiRef.current?.removeAnnotationById?.(annotation.id);
      handleViewerDelete(annotation);
      viewerApiRef.current?.clearSelection?.();
      viewerApiRef.current?.clearSelectedAnnotationIds?.();
      viewerApiRef.current?.enablePan();
      setActiveTool('move');
    },
    [
      canDeleteAnnotations,
      getCanonicalAnnotation,
      getPopupById,
      handleConfirmDelete,
      handleViewerDelete,
      setActiveTool,
    ]
  );

  const handleViewerDeleteMany = React.useCallback(
    (annotations: A9sAnnotation[]) => {
      notifyDeletedAnnotations(annotations);
    },
    [notifyDeletedAnnotations]
  );

  const handleToggleFullScreen = React.useCallback(() => {
    toggleFullScreen();

    if (typeof window !== 'undefined') {
      setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
      }, 0);
    }
  }, [toggleFullScreen]);

  const handleExposeApi = React.useCallback(
    (api: ViewerApi) => {
      viewerApiRef.current = api;
      setOsdReady(true);

      api.enablePan();
      setActiveTool('move');
    },
    [setActiveTool]
  );

  const handleDefaultZoom = React.useCallback(async () => {
    viewerApiRef.current?.goHome();
    viewerApiRef.current?.clearSelection?.();
    viewerApiRef.current?.clearSelectedAnnotationIds?.();
    clearPopupCollection();
    setSelectedAnnotationIds([]);
    dismissActionNotification(ANNOTATION_SELECTION_TOAST_ID);

    if (!manuscriptImage || !imageHeight) return;

    try {
      const refreshed = await buildInitialViewerAnnotations({
        itemImageId: String(manuscriptImage.id),
        iiifImage: manuscriptImage.iiif_image,
        imageHeight,
        allographNameById,
        isPublicDemoMode,
        includeEditorial: canViewEditorialControls,
        includeText: true,
        token,
        currentViewerAnnotations: [],
        currentUrl: '',
      });

      setInitialA9sAnnots(refreshed);
      editorState.resetFrom(refreshed);
    } catch {
      showActionNotification({
        kind: 'error',
        title: 'Failed to reset annotations',
        description: 'Could not reload the saved annotations for this image.',
      });
    }
  }, [
    allographNameById,
    canViewEditorialControls,
    clearPopupCollection,
    imageHeight,
    isPublicDemoMode,
    manuscriptImage,
    token,
    editorState,
  ]);

  const handleMoveTool = React.useCallback(() => {
    viewerApiRef.current?.enablePan();
    setActiveTool('move');
  }, [setActiveTool]);

  const handleModifyTool = React.useCallback(() => {
    cancelPendingPopupClear();
    clearPopupCollection();
    dismissActionNotification(ANNOTATION_SELECTION_TOAST_ID);
    viewerApiRef.current?.enableModify();
    setActiveTool('modify');
  }, [cancelPendingPopupClear, clearPopupCollection, setActiveTool]);

  const handleCreateAnnotation = React.useCallback(
    (kind?: AnnotationCreationKind) => {
      const nextKind = kind ?? getDefaultAnnotationCreationKind(viewerCapabilities);
      if (!nextKind) return;
      if (!canCreateAnnotationKind(viewerCapabilities, nextKind)) return;

      setCurrentCreationKind(nextKind);
      viewerApiRef.current?.enableDraw();
      setActiveTool('draw');
    },
    [viewerCapabilities, setActiveTool, setCurrentCreationKind]
  );

  const handleDeleteTool = React.useCallback(() => {
    if (!canDeleteAnnotations) return;

    viewerApiRef.current?.enableDelete();
    setActiveTool('delete');
  }, [canDeleteAnnotations, setActiveTool]);

  const handleSave = React.useCallback(async (): Promise<void> => {
    // Pre-flight validation lives in the viewer because the rules depend
    // on viewer-side classification (getAnnotationKind uses getCanonicalAnnotation).
    // The hook stays validation-free.
    const validationError = Object.values(editorRecords)
      .filter((r) => r.dirtyState === 'created' || r.dirtyState === 'updated')
      .map((r) => getStandardSaveValidationError(r.annotation))
      .find((m): m is string => Boolean(m));

    if (validationError) {
      showActionNotification({
        kind: 'error',
        title: 'Annotation details required',
        description: validationError,
      });
      return;
    }

    const outcome = await editorState.saveAll();
    const { notice, committed } = describeSaveOutcome(outcome);

    // 'all-succeeded' and 'partial' both committed to the server → clear the
    // selection/popups and re-seed the viewer from the saved state.
    if (committed && 'seed' in outcome) {
      viewerApiRef.current?.clearSelection?.();
      clearPopupCollection();
      setInitialA9sAnnots(outcome.seed);
    }

    if (notice) showActionNotification(notice);
  }, [editorRecords, getStandardSaveValidationError, editorState, clearPopupCollection]);

  const handleAllographDialogOpenChange = React.useCallback(
    (open: boolean) => {
      setIsAllographModalOpen(open);
      if (!open) {
        allographDialogDrag.reset();
      }
    },
    [allographDialogDrag, setIsAllographModalOpen]
  );

  const handleSelectAnnotationFromViewer = React.useCallback(
    (annotation: A9sAnnotation | null) => {
      cancelPendingPopupClear();

      const selected = annotation ? getCanonicalAnnotation(annotation) : null;

      // region → text: highlight the matching span(s) in the side panel.
      setLinkedGraphId(selected ? (dbIdFromA9s(selected) ?? null) : null);

      if (selected) {
        if (activeTool === 'modify') {
          dismissActionNotification(ANNOTATION_SELECTION_TOAST_ID);
          return;
        }

        if (!viewerSettings.selectMultipleAnnotations) {
          const isDrawnDraft = activeTool === 'draw' && !isDbId(selected.id);

          showActionNotification({
            id: ANNOTATION_SELECTION_TOAST_ID,
            kind: isDrawnDraft ? 'created' : 'selected',
            title: isDrawnDraft ? 'Draft annotation drawn' : 'Annotation selected',
            description: isDrawnDraft ? 'Draft annotation created.' : 'Selection updated.',
            duration: 1800,
          });
        }

        openSinglePopupFromAnnotation(selected, { clearHover: true });
        return;
      }

      dismissActionNotification(ANNOTATION_SELECTION_TOAST_ID);

      schedulePopupClear();
    },
    [
      cancelPendingPopupClear,
      schedulePopupClear,
      activeTool,
      getCanonicalAnnotation,
      openSinglePopupFromAnnotation,
      viewerSettings.selectMultipleAnnotations,
    ]
  );

  // ---- Effects ----

  // (currentCreationKind fallback invariant moved into useViewerEditorUiState — Phase A.2)

  React.useEffect(() => {
    setHands([]);
    setHandsLoaded(false);
    setSelectedHand(undefined);
    editorState.resetFrom([]);
    setSelectedAnnotationIds([]);
    // Drop any armed text→region link so a stale arm from the previous image
    // can't hijack the first region drawn on the next one.
    setLinkArm(null);
    resetImageAdjustments();
    // Re-arm the share-URL effect so ?graph=… / ?draft=… is honoured on the
    // new image. Without this, navigating between images via next/link keeps
    // the same viewer instance — the effect ran once and never fires again.
    initialGraphHandledRef.current = false;

    // Visibility-filter reset now lives in useAnnotationVisibilityFilters
    // (keyed on imageId); we only close the panel here.
    closeFilterPanel();
    // resetImageAdjustments and closeFilterPanel are stable; depend on imageId only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageId]);

  // (selectedHand reset invariant moved into useViewerEditorUiState — Phase A.2)

  // (allograph-modal auto-close invariant moved into useViewerEditorUiState — Phase A.2)

  // keep popup on valid tab
  React.useEffect(() => {
    if (!activePopupRecord) return;

    const popupCard = getPopupCardViewData(activePopupRecord, allographNameById);

    const isStandardPopup =
      activePopupRecord.annotation._meta?.annotationType !== 'editorial' &&
      canViewEditorialControls;

    if (
      !isStandardPopup &&
      !popupCard.hasPositionsTab &&
      activePopupRecord.popupTab === 'positions'
    ) {
      handlePopupTabChange(activePopupRecord.id, 'components');
    }
  }, [activePopupRecord, allographNameById, canViewEditorialControls, handlePopupTabChange]);

  // load image-texts for the side panel; auto-open it when the image has text
  React.useEffect(() => {
    let active = true;
    fetchImageTextsForImage(imageId, token)
      .then((texts) => {
        if (!active) return;
        setImageTexts(texts);
        setIsTextPanelOpen(texts.length > 0);
      })
      .catch(() => {
        if (active) setImageTexts([]);
      });
    return () => {
      active = false;
    };
  }, [imageId, token]);

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
          includeEditorial: canViewEditorialControls,
          includeText: true,
          token,
          currentViewerAnnotations: viewerApiRef.current?.getAnnotations?.() ?? [],
        });

        if (isMounted) {
          setInitialA9sAnnots(merged);
          resetEditorFrom(merged);
        }
      } catch {
        if (isMounted) {
          setInitialA9sAnnots([]);
          resetEditorFrom([]);
        }
      }
    };

    void load();

    return () => {
      isMounted = false;
    };
  }, [
    manuscriptImage,
    imageHeight,
    allographNameById,
    isPublicDemoMode,
    canViewEditorialControls,
    token,
    resetEditorFrom,
  ]);

  // Legacy DigiPal toolbar shortcuts, adapted to the current viewer tools.
  // Single useHotkeys subscription; each entry knows whether it should fire
  // inside text inputs (only Cmd/Ctrl+S — the rest skip when typing).
  const canSaveNow = canPersistAnyAnnotations && !isPublicDemoMode && unsavedChanges > 0;
  const [pendingPopupSaveRequest, setPendingPopupSaveRequest] = React.useState(0);
  const handledPendingPopupSaveRef = React.useRef(0);
  const handleSavePopupAnnotation = React.useCallback(
    async (popupId: string) => {
      if (!canPersistAnyAnnotations || isPublicDemoMode) return;
      if (!getPopupById(popupId)) return;

      await handleConfirmDraftAnnotation(popupId);
      setPendingPopupSaveRequest((prev) => prev + 1);
    },
    [canPersistAnyAnnotations, getPopupById, handleConfirmDraftAnnotation, isPublicDemoMode]
  );

  React.useEffect(() => {
    if (pendingPopupSaveRequest === 0) return;
    if (handledPendingPopupSaveRef.current === pendingPopupSaveRequest) return;
    if (!canSaveNow) return;

    handledPendingPopupSaveRef.current = pendingPopupSaveRequest;
    void handleSave();
  }, [canSaveNow, handleSave, pendingPopupSaveRequest]);

  const zoomIn = React.useCallback(() => viewerApiRef.current?.zoomIn(), []);
  const zoomOut = React.useCallback(() => viewerApiRef.current?.zoomOut(), []);
  const panBy = React.useCallback((dx: number, dy: number) => {
    viewerApiRef.current?.panByPixels(dx, dy);
  }, []);
  const viewerHotkeys = React.useMemo<HotkeyDefinition[]>(() => {
    const accept = (handler: () => void) => (event: KeyboardEvent) => {
      event.preventDefault();
      handler();
    };
    const saveIfDirty = (event: KeyboardEvent) => {
      if (!canPersistAnyAnnotations || isPublicDemoMode) return;
      event.preventDefault();
      if (canSaveNow) void handleSave();
    };
    const defs: HotkeyDefinition[] = [
      // Cmd/Ctrl+S — only shortcut that's allowed inside text inputs.
      { key: 's', metaKey: true, allowInEditable: true, handler: saveIfDirty },
      { key: 's', ctrlKey: true, allowInEditable: true, handler: saveIfDirty },
      // Plain S also saves (no modifier). Outside text inputs only.
      { key: 's', handler: saveIfDirty },

      { key: 'Home', handler: accept(() => void handleDefaultZoom()) },
      { key: 'f', handler: accept(handleToggleFullScreen) },
      { key: 'g', handler: accept(handleMoveTool) },
      { key: 'm', handler: accept(handleModifyTool) },
      { key: 'd', handler: accept(() => handleCreateAnnotation()) },
      { key: 'r', handler: accept(() => handleCreateAnnotation()) },

      // Zoom in: Z, +, =
      { key: 'z', handler: accept(zoomIn) },
      { key: '+', handler: accept(zoomIn) },
      { key: '=', handler: accept(zoomIn) },
      // Zoom out: -, _
      { key: '-', handler: accept(zoomOut) },
      { key: '_', handler: accept(zoomOut) },

      // Shift-Arrow pan (Shift required so plain arrow keys still belong to OSD)
      {
        key: 'ArrowUp',
        shiftKey: true,
        handler: accept(() => panBy(0, -LEGACY_SHORTCUT_PAN_STEP)),
      },
      {
        key: 'ArrowDown',
        shiftKey: true,
        handler: accept(() => panBy(0, LEGACY_SHORTCUT_PAN_STEP)),
      },
      {
        key: 'ArrowLeft',
        shiftKey: true,
        handler: accept(() => panBy(-LEGACY_SHORTCUT_PAN_STEP, 0)),
      },
      {
        key: 'ArrowRight',
        shiftKey: true,
        handler: accept(() => panBy(LEGACY_SHORTCUT_PAN_STEP, 0)),
      },
    ];

    if (canCreateEditorialAnnotations) {
      defs.push({ key: 'e', handler: accept(() => handleCreateAnnotation('editorial')) });
    }

    if (canDeleteAnnotations) {
      const del = accept(handleDeleteTool);
      defs.push({ key: 'x', handler: del });
      defs.push({ key: 'Delete', handler: del });
      defs.push({ key: 'Backspace', shiftKey: true, handler: del });
    }

    return defs;
  }, [
    canCreateEditorialAnnotations,
    canDeleteAnnotations,
    canPersistAnyAnnotations,
    canSaveNow,
    handleCreateAnnotation,
    handleDefaultZoom,
    handleDeleteTool,
    handleModifyTool,
    handleMoveTool,
    handleSave,
    handleToggleFullScreen,
    isPublicDemoMode,
    panBy,
    zoomIn,
    zoomOut,
  ]);
  useHotkeys(viewerHotkeys);

  // open shared ?graph=... annotation on first valid load
  React.useEffect(() => {
    if (initialGraphHandledRef.current) return;
    if (!osdReady || typeof window === 'undefined') return;
    // Guard against running against a stale snapshot mid-navigation: only
    // proceed once the loaded image actually matches the URL.
    if (!manuscriptImage || String(manuscriptImage.id) !== imageId) return;

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
  }, [osdReady, a9sSnapshot, openSinglePopupFromAnnotation, manuscriptImage, imageId]);

  // ---- Early returns ----
  if (loading) {
    return <ViewerLoadingState />;
  }

  if (error || !manuscriptImage) {
    return <ViewerErrorState message={error || 'Failed to load manuscript image'} />;
  }

  const imageToolsControl = (
    <ImageToolsControl
      adjustments={imageAdjustments}
      hasChanges={hasImageToolChanges}
      onRotate={handleRotateViewer}
      onAdjustmentChange={handleImageAdjustmentChange}
      onReset={handleResetImageTools}
    />
  );

  const lightboxControl = (
    <LightboxControl image={manuscriptImage} manuscript={manuscript} imageId={imageId} />
  );

  const annotationHeader = (
    <AnnotationHeader
      annotationsEnabled={annotationsEnabled}
      onToggleAnnotations={toggleAnnotations}
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
      selectedHandId={
        selectedHand === undefined ? (defaultHand?.id ?? null) : (selectedHand?.id ?? null)
      }
      onOpenAllographModal={() => {
        setHoveredAnnotationId(null);
        setIsAllographModalOpen(true);
      }}
      onOpenFilterPanel={toggleFilterPanel}
      isVisibilityFilterActive={isVisibilityFilterActive}
      onOpenSettingsPanel={canUseSettings ? toggleSettingsPanel : undefined}
      isSettingsActive={canUseSettings ? isSettingsPanelOpen : false}
      showSettingsButton={canUseSettings}
      lightboxControl={lightboxControl}
      imageToolsControl={imageToolsControl}
      isPageInCollection={isPageInCollection}
      onTogglePageCollection={pageCollectionItem ? handleTogglePageCollection : undefined}
      annotationCollectionCount={pageAnnotationCollectionItems.length}
      onCreateAnnotationCollection={
        pageAnnotationCollectionItems.length > 0 ? handleCreateAnnotationCollection : undefined
      }
    />
  );

  // ---- Render ----
  return (
    <div
      data-open-popups-count={openPopups.length}
      className={
        isFullScreen ? 'fixed inset-0 z-50 flex flex-col bg-black' : 'flex h-[100dvh] flex-col'
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
        onClose={closeFilterPanel}
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
        onClose={closeSettingsPanel}
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
            isFullScreen
              ? 'flex flex-1 gap-3 overflow-hidden p-0'
              : 'flex flex-1 gap-4 overflow-hidden p-4'
          }
        >
          <div
            className={
              isFullScreen
                ? 'relative h-full min-w-0 flex-1 overflow-hidden rounded-lg border bg-accent/50'
                : 'relative h-[calc(100%-3rem)] min-w-0 flex-1 overflow-hidden rounded-lg border bg-accent/50'
            }
          >
            <ViewerToolbar
              toolbarPosition={viewerSettings.toolbarPosition}
              isFullScreen={isFullScreen}
              activeTool={activeTool}
              currentCreationKind={currentCreationKind}
              hasTexts={imageTexts.length > 0}
              isTextPanelOpen={isTextPanelOpen}
              canCreateEditorialAnnotations={canCreateEditorialAnnotations}
              canPersistAnyAnnotations={canPersistAnyAnnotations}
              unsavedChanges={unsavedChanges}
              canDeleteAnnotations={canDeleteAnnotations}
              canCreatePublicAnnotations={canCreatePublicAnnotations}
              onToggleFullScreen={handleToggleFullScreen}
              onMoveTool={handleMoveTool}
              onZoomIn={() => viewerApiRef.current?.zoomIn()}
              onZoomOut={() => viewerApiRef.current?.zoomOut()}
              onRefresh={() => void handleDefaultZoom()}
              onToggleTextPanel={() => setIsTextPanelOpen((open) => !open)}
              onCreateAnnotation={handleCreateAnnotation}
              onSave={() => void handleSave()}
              onDeleteTool={handleDeleteTool}
              onModifyTool={handleModifyTool}
            />

            <ManuscriptAnnotorious
              iiifImageUrl={browserSafeIiifUrl(getIiifBaseUrl(manuscriptImage.iiif_image))}
              initialAnnotations={initialA9sAnnots}
              annotationFilter={annotationVisibilityFilter}
              disableEditor={true}
              readOnly={false}
              allowMultipleSelection={viewerSettings.selectMultipleAnnotations}
              autoCommitDrawSelections={
                viewerSettings.selectMultipleAnnotations && currentCreationKind === 'public'
              }
              onSelectionIdsChange={handleSelectionIdsChange}
              onCreate={handleViewerCreate}
              onUpdate={handleViewerUpdate}
              onDelete={handleViewerDelete}
              onDeleteMany={handleViewerDeleteMany}
              confirmDelete={handleConfirmDelete}
              confirmDeleteMany={handleConfirmDeleteMany}
              onSelect={handleSelectAnnotationFromViewer}
              exposeApi={handleExposeApi}
            />

            <AnnotationPopupLayer
              visiblePopupRecords={visiblePopupRecords}
              activePopupId={activePopupId}
              viewerCapabilities={viewerCapabilities}
              allographs={allographs}
              allographNameById={allographNameById}
              allographLabelById={allographLabelById}
              handsForThisImage={handsForThisImage}
              handNameById={handNameById}
              allowMultipleBoxes={viewerSettings.allowMultipleBoxes}
              singlePopupPosition={singlePopupPosition}
              getCollectionItemFor={getCollectionItemFor}
              isInCollection={isInCollection}
              getCanonicalAnnotation={getCanonicalAnnotation}
              onActivatePopup={handleActivatePopup}
              onPopupPositionChange={handlePopupPositionChange}
              updatePopupById={updatePopupById}
              onDraftAllographIdChange={handleDraftAllographIdChange}
              onDraftHandIdChange={handleDraftHandIdChange}
              onPopupTabChange={handlePopupTabChange}
              canSaveAnnotationShortcuts={canPersistAnyAnnotations && !isPublicDemoMode}
              isSaveAnnotationShortcutDisabled={false}
              canDeleteAnnotationShortcuts={canDeleteAnnotations}
              onSaveAnnotationShortcut={handleSavePopupAnnotation}
              onDeleteAnnotationShortcut={handleDeletePopupAnnotation}
              onCopyShareUrl={(id) => void handleCopyShareUrl(id)}
              onHideShareUrl={handleHideShareUrl}
              onShareSelectedAnnotation={handleShareSelectedAnnotation}
              onCloseSelectedAnnotation={handleCloseSelectedAnnotation}
              onToggleAnnotationCollection={handleToggleAnnotationCollection}
              onCancelDraftAnnotation={handleCancelDraftAnnotation}
              onConfirmDraftAnnotation={handleConfirmDraftAnnotation}
            />
          </div>

          {isTextPanelOpen && imageTexts.length > 0 && (
            <div
              className={
                isFullScreen
                  ? 'h-full w-[34rem] max-w-[45%] shrink-0'
                  : 'h-[calc(100%-3rem)] w-[34rem] max-w-[45%] shrink-0'
              }
            >
              <ViewerTextPanel
                texts={imageTexts}
                linkedGraphId={linkedGraphId}
                onSpanHover={(graphId) =>
                  setHoveredAnnotationId(graphId != null ? `db:${graphId}` : null)
                }
                onSpanActivate={(graphId) => {
                  viewerApiRef.current?.selectAnnotationById?.(`db:${graphId}`);
                  viewerApiRef.current?.centerOnAnnotation?.(`db:${graphId}`);
                  // Programmatic selection doesn't fire onSelect, so mark the
                  // span linked here to keep the click path symmetric.
                  setLinkedGraphId(graphId);
                }}
                canLink={canPersistAnyAnnotations && !isPublicDemoMode}
                armedElementIndex={linkArm?.elementIndex ?? null}
                onArmLink={(textId, elementIndex, label) => {
                  setLinkArm({ textId, elementIndex, label });
                  // Arm the draw tool so the editor can immediately draw.
                  handleCreateAnnotation();
                }}
                onCancelLink={() => {
                  setLinkArm(null);
                  handleMoveTool();
                }}
                onClose={() => setIsTextPanelOpen(false)}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
