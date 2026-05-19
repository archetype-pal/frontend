import type {
  AnnotationCreationKind,
  AnnotationPopupCapabilities,
  AnnotationPopupEditorMode,
  AnnotationPopupMetaSummary,
  PopupRecord,
  ViewerCapabilities,
} from '@/types/annotation-viewer';
import type { Annotation as A9sAnnotation } from '@/components/manuscript/manuscript-annotorious';
import { isDbId } from '@/lib/annotation-popup-utils';
import {
  buildEditorialAnnotationBody,
  buildStandardAnnotationBody,
  getAllographBodyText,
  getStandardAnnotationNote,
} from '@/lib/annotation-notes';

export type PopupPosition = {
  x: number;
  y: number;
};

export const DEFAULT_SINGLE_POPUP_POSITION: PopupPosition = { x: 0, y: 300 };
export const MULTI_POPUP_OFFSET_STEP = 24;
export const MULTI_POPUP_BASE_Y = 300;
export const ACTIVE_POPUP_Z_INDEX = 80;
export const INACTIVE_POPUP_BASE_Z_INDEX = 60;

export function getAnnotationKindFromPopupRecord(popupRecord: PopupRecord): AnnotationCreationKind {
  return popupRecord.annotation._meta?.annotationType === 'editorial' ? 'editorial' : 'public';
}

// Build position-detail objects from the draft id list, falling back to
// "Position {id}" when the name isn't in the lookup. Without the fallback,
// reassigning an allograph (which swaps positionNameById to a different
// set) silently drops any position label not present in the new allograph
// — the backend keeps the id, but the popup renders "0 positions."
export function buildPositionDetails(
  positionIds: number[],
  positionNameById: Map<number, string>
): { id: number; name: string }[] {
  return positionIds.map((id) => ({
    id,
    name: positionNameById.get(id) ?? `Position ${id}`,
  }));
}

// Project a popup's draft fields onto an annotation. Three callers used to
// inline near-identical shape construction (buildStandardAnnotationFromPopup,
// buildEditorialAnnotationFromPopup, and the inline `next` build in
// handleSaveDraftAnnotation). The base annotation defaults to the popup's
// own annotation; pass an explicit base for bulk-apply paths that propagate
// one popup's metadata to other selected drafts.
export function buildPopupAnnotationPayload({
  popup,
  isEditorial,
  positionNameById,
  base,
}: {
  popup: PopupRecord;
  isEditorial: boolean;
  positionNameById: Map<number, string>;
  base?: A9sAnnotation;
}): A9sAnnotation {
  const source = base ?? popup.annotation;
  return {
    ...source,
    type: 'Annotation',
    _meta: isEditorial
      ? {
          ...source._meta,
          annotationType: 'editorial',
          allographId: undefined,
          handId: undefined,
          graphcomponentSet: [],
          positions: [],
          positionDetails: [],
          internalNote: popup.draftInternalNoteText.trim(),
        }
      : {
          ...source._meta,
          allographId: popup.draftAllographId ?? undefined,
          handId: popup.draftHandId ?? undefined,
          note: popup.draftNoteText.trim(),
          graphcomponentSet: popup.draftGraphcomponentSet,
          positions: popup.draftPositionIds,
          positionDetails: buildPositionDetails(popup.draftPositionIds, positionNameById),
        },
    body: isEditorial
      ? buildEditorialAnnotationBody(popup.draftInternalNoteText)
      : buildStandardAnnotationBody(popup.draftAllographText, popup.draftNoteText),
  };
}

export function getPopupCapabilities(
  popupRecord: PopupRecord,
  viewerCapabilities: ViewerCapabilities
): AnnotationPopupCapabilities {
  const isDraft = !isDbId(popupRecord.annotation.id);
  const kind = getAnnotationKindFromPopupRecord(popupRecord);

  const canPersistDraft =
    isDraft &&
    (kind === 'editorial'
      ? viewerCapabilities.canPersistEditorialAnnotations
      : viewerCapabilities.canPersistPublicAnnotations);

  return {
    canShare: true,
    canUseCollection: !isDraft,
    canEditDraft: isDraft,
    canPersistDraft,
    canViewEditorMeta: viewerCapabilities.canViewEditorialControls,
  };
}

export function getPopupCardViewData(
  popupRecord: PopupRecord,
  allographNameById: Map<number, string>
) {
  const annotation = popupRecord.annotation;
  const annotationKind = annotation._meta?.annotationType === 'editorial' ? 'editorial' : 'public';
  const isDraft = !isDbId(annotation.id);

  const title = isDraft
    ? annotationKind === 'editorial'
      ? 'Editorial Annotation'
      : popupRecord.draftAllographText.trim() || 'New Annotation'
    : annotationKind === 'editorial'
      ? 'Editorial Annotation'
      : getAllographBodyText(annotation) ||
        allographNameById.get(annotation._meta?.allographId ?? -1) ||
        'Annotation';

  const positions = annotation._meta?.positionDetails ?? [];
  const hasPositionsTab = positions.length > 0;

  const selectedPositionLabels = positions.map(
    (position) => position.name ?? `Position ${position.id}`
  );

  const graphComponents = annotation._meta?.graphcomponentSet ?? [];
  const selectedComponentGroups =
    graphComponents.length > 0
      ? graphComponents.map((gc) => ({
          componentId: gc.component,
          componentName: gc.componentName ?? `Component ${gc.component}`,
          featureNames:
            gc.featureDetails?.map((feature) => feature.name) ??
            gc.features.map((featureId) => `Feature ${featureId}`),
        }))
      : [];

  const selectedNote = getStandardAnnotationNote(annotation);
  const selectedNotes = selectedNote ? [selectedNote] : [];

  return {
    annotation,
    annotationKind,
    isDraft,
    title,
    hasPositionsTab,
    selectedPositionLabels,
    selectedComponentGroups,
    selectedNotes,
  };
}

export function getPopupInitialPosition(
  index: number,
  allowMultipleBoxes: boolean,
  singlePopupPosition: { x: number; y: number }
) {
  if (!allowMultipleBoxes) {
    return singlePopupPosition;
  }

  return {
    x: index * MULTI_POPUP_OFFSET_STEP,
    y: MULTI_POPUP_BASE_Y + index * MULTI_POPUP_OFFSET_STEP,
  };
}

export function getPopupZIndex(index: number, isActive: boolean) {
  return isActive ? ACTIVE_POPUP_Z_INDEX : INACTIVE_POPUP_BASE_Z_INDEX + index;
}

export function getPopupMetaSummary(
  popupRecord: PopupRecord,
  allographLabelById: Map<number, string>,
  handNameById: Map<number, string>
): AnnotationPopupMetaSummary {
  const meta = popupRecord.annotation._meta;
  const annotationKind: AnnotationCreationKind =
    meta?.annotationType === 'editorial' ? 'editorial' : 'public';

  return {
    kindLabel: annotationKind === 'editorial' ? 'Editorial' : 'Public',
    allographLabel:
      typeof meta?.allographId === 'number'
        ? (allographLabelById.get(meta.allographId) ?? null)
        : null,
    handLabel: typeof meta?.handId === 'number' ? (handNameById.get(meta.handId) ?? null) : null,
  };
}

export function getPopupEditorMode(
  popupRecord: PopupRecord,
  popupCapabilities: AnnotationPopupCapabilities
): AnnotationPopupEditorMode {
  const isDraft = !isDbId(popupRecord.annotation.id);
  const isEditorial = popupRecord.annotation._meta?.annotationType === 'editorial';

  if (!isDraft) {
    if (isEditorial) return 'editorial_existing';
    return popupCapabilities.canViewEditorMeta ? 'standard_existing' : 'public_existing';
  }

  if (isEditorial) {
    return 'editorial_draft';
  }

  return popupCapabilities.canPersistDraft ? 'standard_draft' : 'public_demo_draft';
}
