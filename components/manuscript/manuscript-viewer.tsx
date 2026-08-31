'use client';

import * as React from 'react';
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';

import { useAuth } from '@/contexts/auth-context';

import { getIiifBaseUrl } from '@/utils/iiif';
import { cn } from '@/lib/utils';
import { useResizable } from '@/hooks/use-resizable';
import { AnnotationFilterPanel } from './annotation-filter-panel';
import { AnnotationSettingsPanel } from './annotation-settings-panel';
import { AllographGalleryDialog } from './allograph-gallery-dialog';
import { dismissActionNotification, showActionNotification } from '@/components/ui/action-toast';
import { AnnotationHeader } from '@/components/annotation/annotation-header';
import { AnnotationPopupLayer } from '@/components/annotation/annotation-popup-layer';
import { ViewerTextPanel } from './viewer-text-panel';
import { ImageToolsControl } from './image-tools-control';
import { ViewerErrorState, ViewerLoadingState } from './viewer-status-screen';
import { ViewerToolbar } from './viewer-toolbar';
import { ViewerShortcutsHelp } from './viewer-shortcuts-help';

import {
  canCreateAnnotationKind,
  canPersistAnnotationKind,
  getDefaultAnnotationCreationKind,
  getViewerCapabilities,
} from '@/lib/viewer-capabilities';

import type { ViewerApi, Annotation as A9sAnnotation } from './manuscript-annotorious';
import type {
  ViewerCapabilities,
  ViewerMode,
  AnnotationCreationKind,
} from '@/types/annotation-viewer';

import { browserSafeIiifUrl, isDbId } from '@/lib/annotation-popup-utils';

import { getPopupCardViewData } from '@/lib/manuscript-viewer-popup-utils';

import { dbIdFromA9s } from '@/lib/anno-mapping';
import { useViewerAnnotationLoader } from '@/hooks/manuscript/use-viewer-annotation-loader';
import { formatAllographLabel } from '@/lib/allograph-labels';
import { getDefaultHand, sortHandsByPriority } from '@/lib/hand-ordering';

import { useAnnotationEditorState } from '@/hooks/use-annotation-editor-state';
import { useAnnotationNotifications } from '@/hooks/manuscript/use-annotation-notifications';
import { useViewerEditorUiState } from '@/hooks/use-viewer-editor-ui-state';

import { useManuscriptPopups } from '@/hooks/use-manuscript-popups';
import { useAnnotationVisibilityToggle } from '@/hooks/manuscript/use-annotation-visibility-toggle';
import { useCollectionActions } from '@/hooks/manuscript/use-collection-actions';
import { useViewerBaseData } from '@/hooks/manuscript/use-viewer-base-data';
import { useViewerTextMode } from '@/hooks/manuscript/use-viewer-text-mode';
import { useViewerHighlights } from '@/hooks/manuscript/use-viewer-highlights';
import { useAnnotationVisibilityFilters } from '@/hooks/manuscript/use-annotation-visibility-filters';
import { describeSaveOutcome, standardSaveValidationError } from '@/lib/manuscript-viewer-save';
import { usePopupSelection } from '@/hooks/manuscript/use-popup-selection';
import { useAnnotationDeletion } from '@/hooks/manuscript/use-annotation-deletion';
import { useImageTextLinking } from '@/hooks/manuscript/use-image-text-linking';
import { useShareTarget } from '@/hooks/manuscript/use-share-target';
import { useSearchRegionTarget } from '@/hooks/manuscript/use-search-region-target';
import { useDraftSaveFlow } from '@/hooks/manuscript/use-draft-save-flow';
import { useDraggablePosition } from '@/hooks/use-draggable-position';
import { useAnnotationViewerSettings } from '@/hooks/use-annotation-viewer-settings';
import {
  useViewerImageAdjustments,
  type ImageAdjustmentKey,
} from '@/hooks/use-viewer-image-adjustments';
import { useViewerChromeState } from '@/hooks/use-viewer-chrome-state';
import { useViewerShortcuts } from '@/hooks/manuscript/use-viewer-shortcuts';

const ManuscriptAnnotorious = dynamic(() => import('./manuscript-annotorious'), { ssr: false });
const ANNOTATION_SELECTION_TOAST_ID = 'annotation-selection-toast';

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
  const tManuscript = useTranslations('manuscript');

  const isPublicDemoMode = mode === 'public';

  const canCreatePublicAnnotations = viewerCapabilities.canCreatePublicAnnotations;
  const canPersistPublicAnnotations = viewerCapabilities.canPersistPublicAnnotations;
  const canCreateEditorialAnnotations = viewerCapabilities.canCreateEditorialAnnotations;
  const canPersistEditorialAnnotations = viewerCapabilities.canPersistEditorialAnnotations;
  const canDeleteAnnotations = viewerCapabilities.canDeleteAnnotations;
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

  const [selectedAnnotationIds, setSelectedAnnotationIds] = React.useState<string[]>([]);

  // Image tile controls: rotation + brightness/contrast/saturation. The OSD
  // viewer is the only consumer of viewerApiRef/osdReady here, so this stays
  // inline rather than behind a one-call wrapper hook.
  const imageTools = useViewerImageAdjustments();
  const { adjustments: imageAdjustments, hasChanges: hasImageToolChanges } = imageTools;
  const resetImageAdjustments = imageTools.reset;

  const handleRotateViewer = React.useCallback(
    (degrees: number) => {
      viewerApiRef.current?.rotateBy(degrees);
      imageTools.rotate(degrees);
    },
    [imageTools, viewerApiRef]
  );

  const handleImageAdjustmentChange = React.useCallback(
    (key: ImageAdjustmentKey, value: number) => {
      imageTools.setAdjustment(key, value);
    },
    [imageTools]
  );

  const handleResetImageTools = React.useCallback(() => {
    viewerApiRef.current?.resetRotation();
    imageTools.reset();
  }, [imageTools, viewerApiRef]);

  // Push tile adjustments to the OSD viewer once it's ready.
  React.useEffect(() => {
    if (!osdReady) return;
    viewerApiRef.current?.setImageAdjustments(imageAdjustments);
  }, [imageAdjustments, osdReady, viewerApiRef]);

  const { annotationsEnabled, toggleAnnotations } = useAnnotationVisibilityToggle({
    imageId,
    osdReady,
    viewerApiRef,
  });

  const {
    viewerSettings,
    handleToggleAllowMultipleBoxes,
    handleToggleSelectMultipleAnnotations,
    handleSetToolbarPosition,
    handleSetViewMode,
    handleSetTextPanelPosition,
    handleSetTextDisplayMode,
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

  // ---- Drag hooks (move) ----
  const allographDialogDrag = useDraggablePosition({ x: 300, y: 60 });
  const filterPanelDrag = useDraggablePosition({ x: 0, y: 250 });
  const settingsPanelDrag = useDraggablePosition({ x: 0, y: 250 });

  // ---- Resize hooks (corner grip; persisted per-panel) ----
  const filterPanelResize = useResizable({
    storageKey: 'viewerFilterPanelSize',
    defaultSize: { width: 380 },
    minWidth: 300,
    minHeight: 220,
  });
  const settingsPanelResize = useResizable({
    storageKey: 'viewerSettingsPanelSize',
    defaultSize: { width: 360 },
    minWidth: 300,
    minHeight: 200,
  });
  const galleryResize = useResizable({
    storageKey: 'viewerGalleryDialogSize',
    defaultSize: { width: 520 },
    minWidth: 360,
    minHeight: 240,
  });

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

  const allographNameById = React.useMemo(
    () => new Map(allographs.map((a) => [a.id, a.name])),
    [allographs]
  );
  const allographLabelById = React.useMemo(
    () => new Map(allographs.map((a) => [a.id, formatAllographLabel(a)])),
    [allographs]
  );
  const handsForThisImage = React.useMemo(() => sortHandsByPriority(hands), [hands]);
  const handNameById = React.useMemo(
    () => new Map(handsForThisImage.map((hand) => [hand.id, hand.name])),
    [handsForThisImage]
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

  const { initialA9sAnnots, setInitialA9sAnnots, annotationsLoadedFor, reloadAnnotations } =
    useViewerAnnotationLoader({
      imageId,
      manuscriptImage,
      imageHeight,
      allographNameById,
      isPublicDemoMode,
      canViewEditorialControls,
      token,
      resetEditorFrom,
      viewerApiRef,
    });

  const {
    isInCollection,
    pageCollectionItem,
    isPageInCollection,
    pageAnnotationCollectionItems,
    canCreateAnnotationCollection,
    getCollectionItemFor,
    handleTogglePageCollection,
    handleCreateAnnotationCollection,
    handleToggleAnnotationCollection,
  } = useCollectionActions({
    manuscript,
    manuscriptImage,
    imageHeight,
    editorRecords,
    allographLabelById,
    handNameById,
  });

  const {
    imageTexts,
    linkedGraphId,
    setLinkedGraphId,
    reloadTextsAndAnnotations,
    pendingLinkRegion,
    isPendingLinkRegionId,
    startPendingLink,
    linkPendingToPhrase,
    cancelPendingLink,
    selectedRegionGraphId,
    setSelectedRegionGraphId,
    hoveredRegionGraphId,
    setHoveredRegionGraphId,
    trashSelectedRegion,
    unlinkElementFromRegion,
    linkExistingRegionToElement,
    persistRegionGeometry,
  } = useImageTextLinking({
    imageId,
    token,
    manuscriptImage,
    imageHeight,
    allographNameById,
    isPublicDemoMode,
    canViewEditorialControls,
    viewerApiRef,
    resetEditorFrom,
    setInitialA9sAnnots,
  });

  // The pending text-link region (a box drawn to link a phrase) is canvas-only —
  // text regions are deliberately excluded from editorRecords/a9sSnapshot — so a
  // bare `setAnnotations(initialAnnotations)` re-seed would silently evict it
  // mid-draw. Fold it into the rendered set so it is a first-class annotation
  // that survives every re-seed and selection change until it is linked or
  // cancelled (at which point pendingLinkRegion clears and it drops out).
  const annotationsForViewer = React.useMemo(() => {
    if (!pendingLinkRegion) return initialA9sAnnots;
    const withoutPending = initialA9sAnnots.filter((a) => a.id !== pendingLinkRegion.id);
    return [...withoutPending, pendingLinkRegion];
  }, [initialA9sAnnots, pendingLinkRegion]);

  // Graph ids on the image, for the text panel's dangling-link check. Built from
  // initialA9sAnnots, not a9sSnapshot — the latter excludes text regions.
  //
  // null until loaded: an empty Set claims "nothing is live" and would strip every
  // text link for the duration of the fetch, permanently if the fetch failed.
  const liveGraphIds = React.useMemo(
    () =>
      annotationsLoadedFor === imageId
        ? new Set(
            initialA9sAnnots
              .map((annotation) => dbIdFromA9s(annotation))
              .filter((id): id is number => id != null)
          )
        : null,
    [annotationsLoadedFor, imageId, initialA9sAnnots]
  );

  const {
    hasTexts,
    hasTranscription,
    hasTranslation,
    showTextDisplay,
    setSearchForcesText,
    effectiveViewMode,
    effectiveTextDisplayMode,
    textLinkingActive,
    showTextPanel,
    textPanelPosition,
    isBottomDock,
    isMdUp,
    textPanelResize,
  } = useViewerTextMode({ imageId, imageTexts, viewerSettings });

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

  const dropdownAllograph = filteredAllograph ?? undefined;

  // When the image has exactly one hand, always select it (the header shows it
  // read-only) so new annotations are attributed without the user picking.
  React.useEffect(() => {
    if (handsForThisImage.length === 1 && selectedHand === undefined) {
      setSelectedHand(handsForThisImage[0]);
    }
  }, [handsForThisImage, selectedHand, setSelectedHand]);

  const { activeAllographLabel, filteredA9s } = useViewerHighlights({
    a9sSnapshot,
    filteredAllograph,
    hoveredAllograph,
    selectedHand,
    popupAnnotationId: popupAnnotation?.id,
    hoveredAnnotationId,
    selectedRegionGraphId,
    osdReady,
    viewerApiRef,
  });

  const allographsForThisImage = React.useMemo(() => {
    if (!allographs.length) return [];

    if (!imageAllographIds.length) return allographs;

    const idSet = new Set(imageAllographIds);
    return allographs.filter((a) => idSet.has(a.id));
  }, [allographs, imageAllographIds]);

  React.useEffect(() => {
    if (!filteredAllograph) return;
    if (allographsForThisImage.some((allograph) => allograph.id === filteredAllograph.id)) return;

    setFilteredAllograph(undefined);
    setHoveredAllograph(undefined);
  }, [allographsForThisImage, filteredAllograph, setFilteredAllograph, setHoveredAllograph]);

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
    viewMode: effectiveViewMode,
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
    (annotation: A9sAnnotation) =>
      standardSaveValidationError(annotation, getAnnotationKind(annotation)),
    [getAnnotationKind]
  );

  const { notifyLocalAnnotationUpdate, notifyLocalAnnotationCreate, notifyDeletedAnnotations } =
    useAnnotationNotifications({ canPersistAnyAnnotations, getCanonicalAnnotation });

  const rearmCreateTool = React.useCallback(() => {
    setActiveTool('draw');
    window.setTimeout(() => {
      viewerApiRef.current?.enableDraw();
    }, 0);
  }, [setActiveTool]);

  const {
    handleSelectionIdsChange,
    handlePopupTabChange,
    handleDraftAllographIdChange,
    handleDraftHandIdChange,
    openSinglePopupFromAnnotation,
    closeDraftPopup,
    handleSelectAnnotationFromViewer,
    cancelPendingPopupClear,
  } = usePopupSelection({
    openPopupCollectionFromAnnotation,
    clearPopupCollection,
    getPopupById,
    removePopupById,
    updatePopupById,
    viewerApiRef,
    activeTool,
    setActiveTool,
    rearmCreateTool,
    currentCreationKind,
    filteredAllographId: filteredAllograph?.id,
    activeAssignmentHandId: activeAssignmentHand?.id,
    setHoveredAnnotationId,
    setSelectedAnnotationIds,
    setLinkedGraphId,
    setSelectedRegionGraphId,
    allographNameById,
    getCanonicalAnnotation,
    allowMultipleBoxes: viewerSettings.allowMultipleBoxes,
    selectMultipleAnnotations: viewerSettings.selectMultipleAnnotations,
    textLinkingActive,
    isAllographMode: effectiveViewMode === 'allograph',
    startPendingLink,
    isPendingLinkRegionId,
  });

  const { handleHideShareUrl, handleShareSelectedAnnotation, handleCopyShareUrl } = useShareTarget({
    imageId,
    osdReady,
    manuscriptImage,
    a9sSnapshot,
    viewerApiRef,
    openSinglePopupFromAnnotation,
    getPopupById,
    updatePopupById,
    getAnnotationKind,
  });

  // Search deep-link (?q=): box + centre the matching linked region on the image,
  // alongside the text-panel highlight.
  useSearchRegionTarget({ imageId, osdReady, manuscriptImage, a9sSnapshot, viewerApiRef });

  const { handleViewerCreate, handleViewerUpdate, handleConfirmDraftAnnotation } = useDraftSaveFlow(
    {
      editorState,
      viewerApiRef,
      getPopupById,
      updatePopupById,
      removePopupById,
      getAnnotationKind,
      positionNameById,
      selectMultipleAnnotations: viewerSettings.selectMultipleAnnotations,
      notifyLocalAnnotationCreate,
      notifyLocalAnnotationUpdate,
      activeTool,
      setActiveTool,
      rearmCreateTool,
      textLinkingActive,
      persistRegionGeometry,
      filteredAllographId: filteredAllograph?.id,
      activeAssignmentHandId: activeAssignmentHand?.id,
      currentCreationKind,
    }
  );

  const {
    handleConfirmDelete,
    handleConfirmDeleteMany,
    handleViewerDelete,
    handleViewerDeleteMany,
    handleDeletePopupAnnotation,
  } = useAnnotationDeletion({
    canDeleteAnnotations,
    getCanonicalAnnotation,
    getAnnotationKind,
    getPopupById,
    removePopupById,
    notifyDeletedAnnotations,
    markDeleted: editorState.markDeleted,
    viewerApiRef,
    setActiveTool,
  });

  // The draft popup's footer button is "Discard" for a never-saved draft (vs
  // "Cancel" when editing a saved annotation). A brand-new annotation has
  // nothing to revert to, so discarding it removes it outright — no Save, no
  // trash tool needed. closeDraftPopup alone only closes the editor and would
  // leave a staged draft on the canvas.
  const handleCancelDraftAnnotation = React.useCallback(
    (popupId: string) => {
      const popup = getPopupById(popupId);
      if (popup && !isDbId(popup.annotation.id)) {
        viewerApiRef.current?.removeAnnotationById?.(popup.annotation.id);
        editorState.markDeleted(popup.annotation.id);
      }
      closeDraftPopup(popupId);
    },
    [getPopupById, viewerApiRef, editorState, closeDraftPopup]
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

    try {
      await reloadAnnotations();
    } catch {
      showActionNotification({
        kind: 'error',
        title: 'Failed to reset annotations',
        description: 'Could not reload the saved annotations for this image.',
      });
    }
  }, [clearPopupCollection, reloadAnnotations]);

  const handleMoveTool = React.useCallback(() => {
    viewerApiRef.current?.enablePan();
    setActiveTool('move');
  }, [setActiveTool]);

  // Switching view mode resets to the move/pan tool. Otherwise a draw tool left
  // armed (e.g. after switching views mid-draw) turns the next click on an
  // existing box into a brand-new draft instead of a selection — which is what
  // surfaced the "clicking a region opens the glyph popup" bug.
  const handleSetViewModeAndResetTool = React.useCallback(
    (mode: Parameters<typeof handleSetViewMode>[0]) => {
      // A deliberate mode choice wins over the search deep-link's transient view.
      setSearchForcesText(false);
      handleSetViewMode(mode);
      handleMoveTool();
    },
    [handleSetViewMode, handleMoveTool, setSearchForcesText]
  );

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

  const handleToggleMoveDrawTool = React.useCallback(() => {
    if (activeTool === 'draw') {
      handleMoveTool();
      return;
    }

    handleCreateAnnotation('public');
  }, [activeTool, handleCreateAnnotation, handleMoveTool]);

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
  }, [
    editorRecords,
    getStandardSaveValidationError,
    editorState,
    clearPopupCollection,
    setInitialA9sAnnots,
  ]);

  const handleAllographDialogOpenChange = React.useCallback(
    (open: boolean) => {
      setIsAllographModalOpen(open);
      if (!open) {
        allographDialogDrag.reset();
      }
    },
    [allographDialogDrag, setIsAllographModalOpen]
  );

  // ---- Effects ----

  // (currentCreationKind fallback invariant moved into useViewerEditorUiState — Phase A.2)

  React.useEffect(() => {
    setHands([]);
    setHandsLoaded(false);
    setSelectedHand(undefined);
    editorState.resetFrom([]);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- per-image teardown: clears several independent state atoms alongside an imperative editor reset (editorState.resetFrom) and hook resetters; this is genuine synchronization on image change, and the `key`-reset boundary lives in the parent (out of scope to edit).
    setSelectedAnnotationIds([]);
    // (pending-link/selected-region reset → useImageTextLinking; share-URL
    // re-arm → useShareTarget; both keyed on imageId.)
    resetImageAdjustments();

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
      handlePopupTabChange(activePopupRecord.id, 'details');
    }
  }, [activePopupRecord, allographNameById, canViewEditorialControls, handlePopupTabChange]);

  const { isShortcutsOpen, setIsShortcutsOpen, handleSavePopupAnnotation } = useViewerShortcuts({
    viewerApiRef,
    activePopupRecord,
    getPopupById,
    canCreateEditorialAnnotations,
    canDeleteAnnotations,
    canPersistAnyAnnotations,
    isPublicDemoMode,
    unsavedChanges,
    handleConfirmDraftAnnotation,
    handleCreateAnnotation,
    handleDefaultZoom,
    handleDeleteTool,
    handleModifyTool,
    handleMoveTool,
    handleSave,
    handleToggleFullScreen,
    handleToggleMoveDrawTool,
  });

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

  const annotationHeader = (
    <AnnotationHeader
      viewMode={effectiveViewMode}
      onSetViewMode={handleSetViewModeAndResetTool}
      hasTexts={hasTexts}
      unsavedCount={unsavedChanges}
      selectedAnnotationsCount={selectedAnnotationIds.length}
      showUnsavedCount={canPersistAnyAnnotations}
      onOpenFilterPanel={toggleFilterPanel}
      isVisibilityFilterActive={isVisibilityFilterActive}
      annotationsEnabled={annotationsEnabled}
      onToggleAnnotations={toggleAnnotations}
      onOpenSettingsPanel={canUseSettings ? toggleSettingsPanel : undefined}
      isSettingsActive={canUseSettings ? isSettingsPanelOpen : false}
      showSettingsButton={canUseSettings}
      imageToolsControl={imageToolsControl}
      isPageInCollection={isPageInCollection}
      onTogglePageCollection={pageCollectionItem ? handleTogglePageCollection : undefined}
      annotationCollectionCount={pageAnnotationCollectionItems.length}
      onCreateAnnotationCollection={
        canCreateAnnotationCollection ? handleCreateAnnotationCollection : undefined
      }
      hands={handsForThisImage}
      selectedHandId={
        selectedHand === undefined ? (defaultHand?.id ?? null) : (selectedHand?.id ?? null)
      }
      onHandSelect={setSelectedHand}
      allographs={allographsForThisImage}
      selectedAllographId={dropdownAllograph?.id ?? null}
      onAllographSelect={setFilteredAllograph}
      onAllographHover={setHoveredAllograph}
      activeAllographCount={filteredA9s.length}
      activeAllographLabel={activeAllographLabel}
      onOpenAllographModal={() => {
        setHoveredAnnotationId(null);
        setIsAllographModalOpen(true);
      }}
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
        annotationsEnabled={annotationsEnabled}
        onToggleAnnotations={toggleAnnotations}
        allographs={allographsForThisImage}
        hands={handsForThisImage}
        selectedAllographIds={visibilityFilters.allographIds}
        selectedHandIds={visibilityFilters.handIds}
        showEditorialToggle={canViewEditorialControls}
        showEditorial={visibilityFilters.showEditorial}
        showPublicAnnotations={visibilityFilters.showPublicAnnotations}
        activeAllographId={filteredAllograph?.id ?? null}
        onClose={closeFilterPanel}
        onToggleAllAllographs={handleToggleAllAllographFilters}
        onToggleAllHands={handleToggleAllHandFilters}
        onToggleAllograph={handleToggleAllographFilter}
        onToggleHand={handleToggleHandFilter}
        onToggleEditorial={handleToggleEditorialVisibility}
        onTogglePublicAnnotations={handleTogglePublicAnnotationsVisibility}
        onFocusAllograph={(allograph) => {
          setFilteredAllograph(allograph);
          setHoveredAnnotationId(null);
          setIsAllographModalOpen(true);
        }}
        onFocusHand={(hand) =>
          setSelectedHand(handsForThisImage.find((h) => h.id === hand.id) ?? null)
        }
        onAllographHover={setHoveredAllograph}
        width={filterPanelResize.size.width}
        height={filterPanelResize.size.height}
        resizeHandleProps={filterPanelResize.bindResize}
      />

      <AnnotationSettingsPanel
        isOpen={isSettingsPanelOpen}
        transform={`translate(${settingsPanelDrag.pos.x}px, ${settingsPanelDrag.pos.y}px)`}
        dragHandleProps={settingsPanelDrag.bindDrag}
        viewerSettings={viewerSettings}
        showEditorSettings={canUseEditorSettings}
        showTextDisplay={showTextDisplay}
        hasTranscription={hasTranscription}
        hasTranslation={hasTranslation}
        onClose={closeSettingsPanel}
        onToggleAllowMultipleBoxes={handleToggleAllowMultipleBoxes}
        onToggleSelectMultipleAnnotations={handleToggleSelectMultipleAnnotations}
        onSetToolbarPosition={handleSetToolbarPosition}
        onSetTextPanelPosition={handleSetTextPanelPosition}
        onSetTextDisplayMode={handleSetTextDisplayMode}
        width={settingsPanelResize.size.width}
        height={settingsPanelResize.size.height}
        resizeHandleProps={settingsPanelResize.bindResize}
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
        width={galleryResize.size.width}
        height={galleryResize.size.height}
        resizeHandleProps={galleryResize.bindResize}
      />

      <ViewerShortcutsHelp
        open={isShortcutsOpen}
        onOpenChange={setIsShortcutsOpen}
        showEditingShortcuts={
          canCreatePublicAnnotations || canCreateEditorialAnnotations || canDeleteAnnotations
        }
      />

      {/* min-h-0 is load-bearing: without it this flex child's min-height:auto
          lets it grow to its content's intrinsic height (the image / the editor
          min-heights), overflowing the viewport and spilling over the footer. */}
      <div className={cn('relative flex min-h-0 flex-1', isFullScreen && 'mt-20')}>
        <div
          className={cn(
            // gap-0: the text-panel splitter provides the divider between canvas
            // and panel, so a flex gap would just detach it.
            'flex min-h-0 flex-1 gap-0 overflow-hidden',
            isFullScreen ? 'p-0' : 'p-4',
            // Mobile always stacks the panel under the image; ≥md honors the
            // chosen side (left reverses DOM order so the canvas stays first
            // for tab order / screen readers).
            'flex-col',
            textPanelPosition === 'bottom'
              ? 'md:flex-col'
              : textPanelPosition === 'left'
                ? 'md:flex-row-reverse'
                : 'md:flex-row'
          )}
        >
          <div
            role="region"
            aria-label="Manuscript image"
            className={cn(
              'relative min-h-0 min-w-0 flex-1 overflow-hidden rounded-lg border border-border bg-[var(--viewer-canvas)]',
              // In "Both", recede the glyph layer so the text layer reads as focus.
              effectiveViewMode === 'both' && 'viewer-mode-both',
              effectiveViewMode === 'text' && 'viewer-mode-text'
            )}
          >
            <ViewerToolbar
              toolbarPosition={viewerSettings.toolbarPosition}
              isFullScreen={isFullScreen}
              activeTool={activeTool}
              currentCreationKind={currentCreationKind}
              canCreateEditorialAnnotations={canCreateEditorialAnnotations}
              canPersistAnyAnnotations={canPersistAnyAnnotations}
              unsavedChanges={unsavedChanges}
              canDeleteAnnotations={canDeleteAnnotations}
              canCreatePublicAnnotations={canCreatePublicAnnotations}
              textOnlyMode={textLinkingActive}
              onToggleFullScreen={handleToggleFullScreen}
              onMoveTool={handleMoveTool}
              onZoomIn={() => viewerApiRef.current?.zoomIn()}
              onZoomOut={() => viewerApiRef.current?.zoomOut()}
              onRefresh={() => void handleDefaultZoom()}
              onCreateAnnotation={handleCreateAnnotation}
              onSave={() => void handleSave()}
              onDeleteTool={handleDeleteTool}
              onModifyTool={handleModifyTool}
              onShowShortcuts={() => setIsShortcutsOpen(true)}
            />

            <ManuscriptAnnotorious
              iiifImageUrl={browserSafeIiifUrl(getIiifBaseUrl(manuscriptImage.iiif_image))}
              initialAnnotations={annotationsForViewer}
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
              onDeleteTextRegion={(annotation) => {
                const graphId = dbIdFromA9s(annotation);
                if (graphId != null && window.confirm(tManuscript('delete.regionConfirm'))) {
                  trashSelectedRegion(graphId);
                }
              }}
              confirmDelete={handleConfirmDelete}
              confirmDeleteMany={handleConfirmDeleteMany}
              onSelect={handleSelectAnnotationFromViewer}
              onHover={(annotationId) =>
                setHoveredRegionGraphId(
                  annotationId && isDbId(annotationId) ? Number(annotationId.slice(3)) : null
                )
              }
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
              canDeleteAnnotationShortcuts={canDeleteAnnotations}
              onSaveAnnotationShortcut={handleSavePopupAnnotation}
              onDeleteAnnotationShortcut={handleDeletePopupAnnotation}
              onCopyShareUrl={(id) => void handleCopyShareUrl(id)}
              onHideShareUrl={handleHideShareUrl}
              onShareSelectedAnnotation={handleShareSelectedAnnotation}
              onCloseSelectedAnnotation={closeDraftPopup}
              onToggleAnnotationCollection={handleToggleAnnotationCollection}
              onCancelDraftAnnotation={handleCancelDraftAnnotation}
              onConfirmDraftAnnotation={handleConfirmDraftAnnotation}
            />
          </div>

          {showTextPanel && (
            <>
              {/* Draggable splitter (desktop only; mobile stacks at a % height). */}
              <div
                {...textPanelResize.bindSplitter}
                className={cn(
                  'group relative hidden shrink-0 rounded-full bg-border/60 transition-colors hover:bg-accent/60 focus-visible:bg-accent focus-visible:outline-none md:block',
                  isBottomDock
                    ? "my-1 h-1.5 w-full cursor-row-resize before:absolute before:inset-x-0 before:-inset-y-2 before:content-['']"
                    : "mx-1 h-full w-1.5 cursor-col-resize before:absolute before:inset-y-0 before:-inset-x-2 before:content-['']"
                )}
              />
              <div
                className={cn(
                  'min-h-0',
                  isBottomDock ? 'h-[40%] w-full shrink-0' : 'h-[45%] w-full shrink-0 md:h-full'
                )}
                style={
                  isMdUp
                    ? isBottomDock
                      ? { height: `${textPanelResize.size}px` }
                      : { width: `${textPanelResize.size}px` }
                    : undefined
                }
              >
                <ViewerTextPanel
                  texts={imageTexts}
                  displayMode={effectiveTextDisplayMode}
                  layout={isBottomDock ? 'row' : 'column'}
                  token={token}
                  canEdit={canPersistAnyAnnotations && !isPublicDemoMode}
                  onTextSaved={() => void reloadTextsAndAnnotations()}
                  linkedGraphId={linkedGraphId}
                  hoveredGraphId={hoveredRegionGraphId}
                  liveGraphIds={liveGraphIds}
                  onSpanHover={(graphId) =>
                    setHoveredAnnotationId(graphId != null ? `db:${graphId}` : null)
                  }
                  onSpanActivate={(graphId) => {
                    viewerApiRef.current?.selectAnnotationById?.(`db:${graphId}`);
                    viewerApiRef.current?.centerOnAnnotation?.(`db:${graphId}`);
                    // Set the linked + selected-region state directly here rather
                    // than relying on the Annotorious selection event, so the
                    // affordance is shown deterministically regardless of whether
                    // the programmatic select emits onSelect.
                    setLinkedGraphId(graphId);
                    // Clicking a linked phrase selects its region so the Link Bar
                    // offers Unlink / Remove. This is the overlap-free way
                    // to reach them: clicking the region on the image is
                    // unreliable when glyphs overlap it in Both view.
                    setSelectedRegionGraphId(graphId);
                  }}
                  canLink={canPersistAnyAnnotations && !isPublicDemoMode}
                  pendingLink={!!pendingLinkRegion}
                  onLinkPhrase={(textId, elementIndex, label) =>
                    linkPendingToPhrase(textId, elementIndex, label)
                  }
                  onCancelPendingLink={() => {
                    // Discarding a drawn box mid-link means "I'll draw a better
                    // one" — keep Draw armed so the next region works immediately
                    // instead of dropping to pan (which surfaced the "draw, cancel,
                    // draw again does nothing" bug).
                    cancelPendingLink();
                    rearmCreateTool();
                  }}
                  selectedRegionGraphId={selectedRegionGraphId}
                  onDeleteRegion={(graphId) => trashSelectedRegion(graphId)}
                  onUnlinkElement={(textId, elementIndex, graphId) =>
                    unlinkElementFromRegion(textId, elementIndex, graphId)
                  }
                  onLinkExistingRegion={(textId, elementIndex, graphId, label) =>
                    linkExistingRegionToElement(textId, elementIndex, graphId, label)
                  }
                  onClose={() => handleSetViewModeAndResetTool('allograph')}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
