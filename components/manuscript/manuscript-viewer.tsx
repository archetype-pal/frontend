'use client';

import * as React from 'react';
import {
  BookOpenText,
  LaptopMinimal,
  ZoomIn,
  ZoomOut,
  Hand,
  Pencil,
  Save,
  Trash2,
  Expand,
  SquarePen,
  RefreshCcw,
  RotateCcw,
  RotateCw,
  SlidersHorizontal,
} from 'lucide-react';
import dynamic from 'next/dynamic';

import { useAuth } from '@/contexts/auth-context';
import { useCollection, type CollectionItem } from '@/contexts/collection-context';

import { getIiifBaseUrl } from '@/utils/iiif';
import { Toolbar } from './toolbar';
import { AnnotationFilterPanel } from './annotation-filter-panel';
import { AnnotationSettingsPanel } from './annotation-settings-panel';
import { AllographGalleryDialog } from './allograph-gallery-dialog';
import { Button } from '@/components/ui/button';
import { dismissActionNotification, showActionNotification } from '@/components/ui/action-toast';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Slider } from '@/components/ui/slider';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AnnotationHeader } from '@/components/annotation/annotation-header';
import { AnnotationPopupLayer } from '@/components/annotation/annotation-popup-layer';
import { OpenLightboxButton } from '@/components/lightbox/open-lightbox-button';
import { fetchHands } from '@/services/manuscripts';
import { fetchImageTextsForImage, type ImageTextDetail } from '@/services/image-texts';
import { ViewerTextPanel } from './viewer-text-panel';
import { a9sToBackendFeature, dbIdFromA9s } from '@/lib/anno-mapping';

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
  A9sWithMeta,
  DraftSharePayload,
  AnnotationVisibilityFilters,
  ViewerCapabilities,
  ViewerMode,
  AnnotationCreationKind,
  PopupRecord,
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
  buildStandardAnnotationBody,
  getAllographBodyText,
  getEditorialInternalNote,
  getStandardAnnotationNote,
} from '@/lib/annotation-notes';

import {
  buildPopupAnnotationPayload,
  getPopupCardViewData,
} from '@/lib/manuscript-viewer-popup-utils';

import {
  fetchImageAllographIds,
  fetchManuscriptViewerBaseData,
} from '@/lib/manuscript-viewer-data';

import { buildInitialViewerAnnotations } from '@/lib/manuscript-viewer-annotations';
import { formatAllographLabel } from '@/lib/allograph-labels';
import { getDefaultHand, sortHandsByPriority } from '@/lib/hand-ordering';

import { useAnnotationEditorState } from '@/hooks/use-annotation-editor-state';
import { useViewerEditorUiState } from '@/hooks/use-viewer-editor-ui-state';

import { useManuscriptPopups } from '@/hooks/use-manuscript-popups';
import { useDraggablePosition } from '@/hooks/use-draggable-position';
import { useAnnotationViewerSettings } from '@/hooks/use-annotation-viewer-settings';
import {
  useViewerImageAdjustments,
  type ImageAdjustmentKey,
} from '@/hooks/use-viewer-image-adjustments';
import { useViewerChromeState } from '@/hooks/use-viewer-chrome-state';
import { useHotkeys, type HotkeyDefinition } from '@/hooks/use-hotkeys';

const ManuscriptAnnotorious = dynamic(() => import('./manuscript-annotorious'), { ssr: false });
const ANNOTATION_SELECTION_TOAST_ID = 'annotation-selection-toast';
const LEGACY_SHORTCUT_PAN_STEP = 60;

function annotationCountLabel(count: number): string {
  return `${count} annotation${count === 1 ? '' : 's'}`;
}

function countPhrase(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

function joinCountPhrases(parts: string[]): string {
  if (parts.length <= 1) return parts[0] ?? '';
  if (parts.length === 2) return `${parts[0]} and ${parts[1]}`;

  return `${parts.slice(0, -1).join(', ')}, and ${parts[parts.length - 1]}`;
}

type ViewerCollectionContext = {
  itemPartId: number;
  itemImageId: number;
  iiifImage: string;
  locus: string;
  shelfmark: string;
  repositoryName: string;
  repositoryCity: string;
  date: string;
};

function buildImageCollectionItem(ctx: ViewerCollectionContext): CollectionItem {
  return {
    id: ctx.itemImageId,
    type: 'image',
    item_part: ctx.itemPartId,
    item_image: ctx.itemImageId,
    image_iiif: ctx.iiifImage,
    shelfmark: ctx.shelfmark,
    locus: ctx.locus,
    repository_name: ctx.repositoryName,
    repository_city: ctx.repositoryCity,
    date: ctx.date,
  };
}

function buildAnnotationCollectionItem(
  annotation: A9sAnnotation,
  imageHeight: number,
  ctx: ViewerCollectionContext
): CollectionItem | null {
  const graphId = dbIdFromA9s(annotation);
  if (graphId == null) return null;

  try {
    const annotationType =
      (annotation as A9sWithMeta)._meta?.annotationType === 'editorial' ? 'editorial' : 'image';

    return {
      id: graphId,
      type: 'graph',
      item_part: ctx.itemPartId,
      item_image: ctx.itemImageId,
      image_iiif: ctx.iiifImage,
      annotation_type: annotationType,
      coordinates: JSON.stringify(a9sToBackendFeature(annotation, imageHeight)),
      shelfmark: ctx.shelfmark,
      locus: ctx.locus,
      repository_name: ctx.repositoryName,
      repository_city: ctx.repositoryCity,
      date: ctx.date,
    };
  } catch {
    return null;
  }
}

function formatSavedAnnotationDescription({
  createdCount,
  updatedCount,
  deletedCount,
}: {
  createdCount: number;
  updatedCount: number;
  deletedCount: number;
}): string {
  const parts = [
    createdCount > 0 ? countPhrase(createdCount, 'created annotation', 'created annotations') : '',
    updatedCount > 0 ? countPhrase(updatedCount, 'updated annotation', 'updated annotations') : '',
    deletedCount > 0 ? countPhrase(deletedCount, 'deleted annotation', 'deleted annotations') : '',
  ].filter(Boolean);

  return parts.length > 0 ? `Saved ${joinCountPhrases(parts)}.` : 'No annotation changes to save.';
}

function ImageAdjustmentSlider({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className="font-medium text-foreground">{label}</span>
        <span className="tabular-nums text-muted-foreground">{value}%</span>
      </div>
      <Slider
        aria-label={label}
        min={min}
        max={max}
        step={5}
        value={[value]}
        onValueChange={(nextValue) => onChange(nextValue[0] ?? value)}
      />
    </div>
  );
}

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
  const { addItem, removeItem, isInCollection, clearCollection } = useCollection();

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

  const [allographs, setAllographs] = React.useState<Allograph[]>([]);
  const [imageAllographIds, setImageAllographIds] = React.useState<number[]>([]);

  const [hands, setHands] = React.useState<HandType[]>([]);
  const [handsLoaded, setHandsLoaded] = React.useState(false);

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
  const [selectedAnnotationIds, setSelectedAnnotationIds] = React.useState<string[]>([]);

  const [imageHeight, setImageHeight] = React.useState<number>(0);

  // Text↔region linking: the image-texts for this image, whether the side
  // panel is shown, and the Graph id of the region currently selected on the
  // image (drives the span highlight in the panel).
  const [imageTexts, setImageTexts] = React.useState<ImageTextDetail[]>([]);
  const [isTextPanelOpen, setIsTextPanelOpen] = React.useState(false);
  const [linkedGraphId, setLinkedGraphId] = React.useState<number | null>(null);

  const imageTools = useViewerImageAdjustments();
  const { adjustments: imageAdjustments, hasChanges: hasImageToolChanges } = imageTools;

  const initialGraphHandledRef = React.useRef(false);
  const pendingPopupClearRef = React.useRef<number | null>(null);

  const collectionContext = React.useMemo<ViewerCollectionContext | null>(() => {
    if (!manuscriptImage) return null;

    return {
      itemPartId: manuscriptImage.item_part,
      itemImageId: manuscriptImage.id,
      iiifImage: manuscriptImage.iiif_image,
      locus: manuscriptImage.locus ?? '',
      shelfmark: manuscript?.current_item?.shelfmark || manuscript?.display_label || '',
      repositoryName: manuscript?.current_item?.repository?.name || '',
      repositoryCity: manuscript?.current_item?.repository?.place || '',
      date: manuscript?.historical_item?.date_display || '',
    };
  }, [manuscript, manuscriptImage]);

  const pageCollectionItem = React.useMemo(
    () => (collectionContext ? buildImageCollectionItem(collectionContext) : null),
    [collectionContext]
  );

  const isPageInCollection = pageCollectionItem
    ? isInCollection(pageCollectionItem.id, 'image')
    : false;

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

  const pageAnnotationCollectionItems = React.useMemo(() => {
    if (!collectionContext || !imageHeight) return [];

    return Object.values(editorRecords)
      .filter((record) => record.source === 'persisted' && !record.isDeleted)
      .map((record) =>
        buildAnnotationCollectionItem(record.annotation, imageHeight, collectionContext)
      )
      .filter((item): item is CollectionItem => item !== null);
  }, [collectionContext, editorRecords, imageHeight]);

  // Closes over collectionContext + imageHeight so AnnotationPopupLayer
  // doesn't need to know either type. Returns null when collection items
  // can't be constructed (no context, no image height, or the annotation
  // has no db id).
  const getCollectionItemFor = React.useCallback(
    (annotation: A9sAnnotation): CollectionItem | null => {
      if (!collectionContext || !imageHeight) return null;
      return buildAnnotationCollectionItem(annotation, imageHeight, collectionContext);
    },
    [collectionContext, imageHeight]
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

      // Text-region annotations exist only to back the transcription↔image
      // link; show them only while the text panel is open so the standard
      // annotation view stays uncluttered.
      if (meta?.annotationType === 'text') return isTextPanelOpen;

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

      return kindPass && allographPass && handPass;
    },
    [
      visibilityFiltersReady,
      visibilityFilters,
      availableAllographFilterIds.length,
      availableHandFilterIds.length,
      getCanonicalAnnotation,
      isTextPanelOpen,
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

  const notifyLocalAnnotationUpdate = React.useCallback(
    (count: number) => {
      const isBulk = count > 1;

      showActionNotification({
        kind: isBulk ? 'bulk-updated' : 'updated',
        title: isBulk ? `${annotationCountLabel(count)} updated` : 'Annotation updated',
        description: canPersistAnyAnnotations
          ? 'Pending save.'
          : `${isBulk ? 'Selected annotations were' : 'The annotation was'} updated in the viewer.`,
      });
    },
    [canPersistAnyAnnotations]
  );

  const notifyLocalAnnotationCreate = React.useCallback(
    (count: number) => {
      const isBulk = count > 1;

      showActionNotification({
        kind: isBulk ? 'bulk-created' : 'created',
        title: isBulk ? `${annotationCountLabel(count)} created` : 'Annotation created',
        description: canPersistAnyAnnotations
          ? 'Pending save.'
          : `${isBulk ? 'Annotations were' : 'Annotation was'} created in the viewer.`,
      });
    },
    [canPersistAnyAnnotations]
  );

  const notifyDeletedAnnotations = React.useCallback(
    (annotations: A9sAnnotation[]) => {
      if (annotations.length === 0) return;

      const canonical = annotations.map((annotation) => getCanonicalAnnotation(annotation));
      const draftCount = canonical.filter((annotation) => !isDbId(annotation.id)).length;
      const savedCount = canonical.length - draftCount;
      const isBulk = canonical.length > 1;

      const description =
        savedCount > 0 && canPersistAnyAnnotations
          ? 'Pending save.'
          : `${annotationCountLabel(canonical.length)} removed from the viewer.`;

      showActionNotification({
        kind: isBulk ? 'bulk-deleted' : 'deleted',
        title: isBulk
          ? `${annotationCountLabel(canonical.length)} deleted`
          : draftCount === 1
            ? 'Draft annotation deleted'
            : 'Annotation marked for deletion',
        description,
      });
    },
    [canPersistAnyAnnotations, getCanonicalAnnotation]
  );

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

  const handleViewerCreate = React.useCallback(
    (annotation: A9sAnnotation) => {
      const enriched = decorateCreatedAnnotation(annotation);

      const syncCreatedAnnotation = async () => {
        await viewerApiRef.current?.updateSelectedDraft?.(enriched);

        updatePopupById(enriched.id, { annotation: enriched });
        editorState.markCreated(enriched);
      };

      void syncCreatedAnnotation();
    },
    [decorateCreatedAnnotation, updatePopupById, editorState]
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

      const commonOverrides = {
        popupTab: 'components' as const,
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

  const buildStandardAnnotationFromPopup = React.useCallback(
    (popupId: string): A9sAnnotation | null => {
      const popup = getPopupById(popupId);
      if (!popup) return null;
      return buildPopupAnnotationPayload({ popup, isEditorial: false, positionNameById });
    },
    [getPopupById, positionNameById]
  );

  const buildEditorialAnnotationFromPopup = React.useCallback(
    (popupId: string): A9sAnnotation | null => {
      const popup = getPopupById(popupId);
      if (!popup) return null;
      return buildPopupAnnotationPayload({ popup, isEditorial: true, positionNameById });
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

  // Takes a popup record directly so callers can capture it once before
  // awaiting `handleSaveDraftAnnotation` and not race the createAnnotation
  // event that may evict the popup at that id.
  const applyPopupValuesToDraftAnnotationFromRecord = React.useCallback(
    (annotation: A9sAnnotation, popup: PopupRecord): A9sAnnotation =>
      buildPopupAnnotationPayload({
        popup,
        isEditorial: false,
        positionNameById,
        base: annotation,
      }),
    [positionNameById]
  );

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

  const handleRotateViewer = React.useCallback(
    (degrees: number) => {
      viewerApiRef.current?.rotateBy(degrees);
      imageTools.rotate(degrees);
    },
    [imageTools]
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
  }, [imageTools]);

  const handleTogglePageCollection = React.useCallback(() => {
    if (!pageCollectionItem) return;

    if (isInCollection(pageCollectionItem.id, 'image')) {
      removeItem(pageCollectionItem.id, 'image');
      return;
    }

    addItem(pageCollectionItem);
  }, [addItem, isInCollection, pageCollectionItem, removeItem]);

  const handleCreateAnnotationCollection = React.useCallback(() => {
    if (pageAnnotationCollectionItems.length === 0) return;

    clearCollection();
    pageAnnotationCollectionItems.forEach((item) => addItem(item));

    showActionNotification({
      kind: 'saved',
      title: 'Collection updated',
      description: `Created a collection with ${annotationCountLabel(
        pageAnnotationCollectionItems.length
      )} from this page.`,
    });
  }, [addItem, clearCollection, pageAnnotationCollectionItems]);

  const handleToggleAnnotationCollection = React.useCallback(
    (annotation: A9sAnnotation) => {
      if (!collectionContext || !imageHeight) return;

      const item = buildAnnotationCollectionItem(annotation, imageHeight, collectionContext);
      if (!item) return;

      if (isInCollection(item.id, 'graph')) {
        removeItem(item.id, 'graph');
        return;
      }

      addItem(item);
    },
    [addItem, collectionContext, imageHeight, isInCollection, removeItem]
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

    switch (outcome.kind) {
      case 'no-token':
        showActionNotification({
          kind: 'error',
          title: 'Sign in required',
          description: 'Please log in again before saving annotations.',
        });
        return;
      case 'no-image':
      case 'no-capability':
      case 'no-changes':
        // Silent — the toolbar's Save button is already gated on isDirty,
        // so reaching these branches means there was nothing meaningful
        // to commit.
        return;
      case 'all-failed':
        showActionNotification({
          kind: 'error',
          title: 'Failed to save annotations',
          description: outcome.firstError ?? `${outcome.failedCount} could not be saved.`,
        });
        return;
      case 'saved-but-refresh-failed':
        showActionNotification({
          kind: 'error',
          title: 'Saved but could not refresh',
          description: `${outcome.succeededCount} saved on the server, but reloading failed: ${outcome.message}. Reload the page to see the latest state.`,
        });
        return;
      case 'all-succeeded':
        viewerApiRef.current?.clearSelection?.();
        clearPopupCollection();
        setInitialA9sAnnots(outcome.seed);
        showActionNotification({
          kind: 'saved',
          title: 'Annotations saved',
          description: formatSavedAnnotationDescription({
            createdCount: outcome.counts.created,
            updatedCount: outcome.counts.updated,
            deletedCount: outcome.counts.deleted,
          }),
        });
        return;
      case 'partial':
        viewerApiRef.current?.clearSelection?.();
        clearPopupCollection();
        setInitialA9sAnnots(outcome.seed);
        showActionNotification({
          kind: 'error',
          title: 'Some annotations could not be saved',
          description: `${outcome.succeededCount} saved, ${outcome.failedCount} still unsaved. Try again to retry the failed entries.`,
        });
        return;
    }
  }, [editorRecords, getStandardSaveValidationError, editorState, clearPopupCollection]);

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
    [allographDialogDrag, setIsAllographModalOpen]
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

      pendingPopupClearRef.current = window.setTimeout(() => {
        pendingPopupClearRef.current = null;
        clearSinglePopupState({ clearHover: true });
      }, 50);
    },
    [
      cancelPendingPopupClear,
      clearSinglePopupState,
      activeTool,
      getCanonicalAnnotation,
      openSinglePopupFromAnnotation,
      viewerSettings.selectMultipleAnnotations,
    ]
  );

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

  // (currentCreationKind fallback invariant moved into useViewerEditorUiState — Phase A.2)

  React.useEffect(() => {
    setHands([]);
    setHandsLoaded(false);
    setSelectedHand(undefined);
    editorState.resetFrom([]);
    setSelectedAnnotationIds([]);
    imageTools.reset();
    // Re-arm the share-URL effect so ?graph=… / ?draft=… is honoured on the
    // new image. Without this, navigating between images via next/link keeps
    // the same viewer instance — the effect ran once and never fires again.
    initialGraphHandledRef.current = false;

    setVisibilityFilters({
      allographIds: [],
      handIds: [],
      showEditorial: true,
      showPublicAnnotations: true,
    });

    setAllographFiltersInitialized(false);
    setHandFiltersInitialized(false);
    closeFilterPanel();
    // imageTools.reset and closeFilterPanel are stable; depend on imageId only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        const handsData = await fetchHands(manuscriptImage.item_part, manuscriptImage.id);
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
  }, [manuscriptImage?.id, manuscriptImage?.item_part]);

  // (selectedHand reset invariant moved into useViewerEditorUiState — Phase A.2)

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

  // (allograph-modal auto-close invariant moved into useViewerEditorUiState — Phase A.2)

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

  React.useEffect(() => {
    if (!osdReady) return;
    viewerApiRef.current?.setImageAdjustments(imageAdjustments);
  }, [imageAdjustments, osdReady]);

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

  const imageToolsControl = (
    <Popover>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              variant={hasImageToolChanges ? 'default' : 'outline'}
              size="icon"
              className="h-8 w-8"
              aria-label="Image tools"
            >
              <SlidersHorizontal className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>Image Tools</TooltipContent>
      </Tooltip>
      <PopoverContent align="end" side="bottom" className="w-72 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold leading-none">Image tools</div>
            <div className="mt-1 text-xs text-muted-foreground">Rotation and tile adjustments</div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 gap-1"
            onClick={handleResetImageTools}
          >
            <RefreshCcw className="h-3.5 w-3.5" />
            Reset
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1"
            onClick={() => handleRotateViewer(-90)}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Left
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1"
            onClick={() => handleRotateViewer(90)}
          >
            <RotateCw className="h-3.5 w-3.5" />
            Right
          </Button>
        </div>

        <div className="space-y-4 border-t pt-4">
          <ImageAdjustmentSlider
            label="Brightness"
            min={50}
            max={150}
            value={imageAdjustments.brightness}
            onChange={(value) => handleImageAdjustmentChange('brightness', value)}
          />
          <ImageAdjustmentSlider
            label="Contrast"
            min={50}
            max={150}
            value={imageAdjustments.contrast}
            onChange={(value) => handleImageAdjustmentChange('contrast', value)}
          />
          <ImageAdjustmentSlider
            label="Saturation"
            min={0}
            max={200}
            value={imageAdjustments.saturation}
            onChange={(value) => handleImageAdjustmentChange('saturation', value)}
          />
        </div>
      </PopoverContent>
    </Popover>
  );

  const lightboxControl =
    manuscriptImage && manuscript ? (
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
                date: manuscript.historical_item?.date_display || '',
              }}
              variant="outline"
              size="icon"
              className="h-8 w-8"
            />
          </div>
        </TooltipTrigger>
        <TooltipContent>Open in Lightbox</TooltipContent>
      </Tooltip>
    ) : null;

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
            <Toolbar orientation={viewerSettings.toolbarPosition}>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={isFullScreen ? 'default' : 'ghost'}
                      size="icon"
                      aria-label={isFullScreen ? 'Exit full screen' : 'Full screen'}
                      aria-keyshortcuts="F Shift+F"
                      onClick={handleToggleFullScreen}
                    >
                      <LaptopMinimal className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {isFullScreen ? 'Exit Full Screen' : 'Full Screen'}
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={activeTool === 'move' ? 'default' : 'ghost'}
                      size="icon"
                      aria-label="Select/Drag (g)"
                      aria-keyshortcuts="G Shift+G"
                      onClick={handleMoveTool}
                    >
                      <Hand className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Select/Drag (g)</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Zoom in"
                      aria-keyshortcuts="Z Shift+Z ="
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
                      aria-label="Zoom out"
                      aria-keyshortcuts="-"
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
                      variant="ghost"
                      size="icon"
                      aria-label="Refresh"
                      aria-keyshortcuts="Home"
                      onClick={() => void handleDefaultZoom()}
                    >
                      <RefreshCcw className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Refresh</TooltipContent>
                </Tooltip>

                {imageTexts.length > 0 && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant={isTextPanelOpen ? 'default' : 'ghost'}
                        size="icon"
                        aria-label={isTextPanelOpen ? 'Hide text' : 'Show text'}
                        onClick={() => setIsTextPanelOpen((open) => !open)}
                      >
                        <BookOpenText className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{isTextPanelOpen ? 'Hide text' : 'Show text'}</TooltipContent>
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
                        aria-label="Create editorial annotation"
                        aria-keyshortcuts="E Shift+E"
                        onClick={() => handleCreateAnnotation('editorial')}
                      >
                        <Pencil className="h-4 w-4" />
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
                        aria-label="Save (s)"
                        aria-keyshortcuts="S Shift+S Control+S Meta+S"
                        onClick={() => void handleSave()}
                        disabled={unsavedChanges === 0}
                      >
                        <Save className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Save (s)</TooltipContent>
                  </Tooltip>
                )}

                {canDeleteAnnotations && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant={activeTool === 'delete' ? 'default' : 'ghost'}
                        size="icon"
                        aria-label="Delete (x)"
                        aria-keyshortcuts="X Delete Shift+Backspace"
                        onClick={handleDeleteTool}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Delete (x)</TooltipContent>
                  </Tooltip>
                )}

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={activeTool === 'modify' ? 'default' : 'ghost'}
                      size="icon"
                      aria-label="Modify (m)"
                      aria-keyshortcuts="M Shift+M"
                      onClick={handleModifyTool}
                    >
                      <Expand className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Modify (m)</TooltipContent>
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
                        aria-label="Draw (d)"
                        aria-keyshortcuts="D Shift+D R Shift+R"
                        onClick={() => handleCreateAnnotation('public')}
                      >
                        <SquarePen className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Draw (d)</TooltipContent>
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
                onClose={() => setIsTextPanelOpen(false)}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
