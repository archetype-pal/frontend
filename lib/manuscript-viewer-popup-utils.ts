import type {
  AnnotationCreationKind,
  AnnotationPopupCapabilities,
  AnnotationPopupEditorMode,
  AnnotationPopupMetaSummary,
  PopupRecord,
  ViewerCapabilities,
} from '@/types/annotation-viewer';
import { isDbId } from '@/lib/annotation-popup-utils';

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
    ? popupRecord.draftAllographText.trim() || 'New Annotation'
    : (annotation.body?.find((b) => b.purpose === 'commenting')?.value ??
      allographNameById.get(annotation._meta?.allographId ?? -1) ??
      'Annotation');

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

  const selectedNotes = (annotation.body ?? [])
    .filter((body) => {
      const value = body.value?.trim() ?? '';
      return value.length > 0 && body.purpose !== 'commenting';
    })
    .map((body) => body.value!.trim());

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
  allographNameById: Map<number, string>,
  handNameById: Map<number, string>
): AnnotationPopupMetaSummary {
  const meta = popupRecord.annotation._meta;
  const annotationKind: AnnotationCreationKind =
    meta?.annotationType === 'editorial' ? 'editorial' : 'public';

  return {
    kindLabel: annotationKind === 'editorial' ? 'Editorial' : 'Public',
    allographLabel:
      typeof meta?.allographId === 'number'
        ? (allographNameById.get(meta.allographId) ?? null)
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
    return popupCapabilities.canViewEditorMeta ? 'standard_existing' : 'public_existing';
  }

  if (isEditorial) {
    return 'editorial_draft';
  }

  return popupCapabilities.canPersistDraft ? 'standard_draft' : 'public_demo_draft';
}
