'use client';

import * as React from 'react';

import { isDbId } from '@/lib/annotation-popup-utils';
import { buildPopupAnnotationPayload } from '@/lib/manuscript-viewer-popup-utils';
import type {
  Annotation as A9sAnnotation,
  ViewerApi,
} from '@/components/manuscript/manuscript-annotorious';
import type { A9sWithMeta, AnnotationCreationKind, PopupRecord } from '@/types/annotation-viewer';

interface EditorStateSlice {
  markCreated: (annotation: A9sAnnotation) => void;
  markUpdated: (annotation: A9sAnnotation, options?: { debounced?: boolean }) => void;
  markManyUpdated: (annotations: A9sAnnotation[]) => void;
  replaceLocalAnnotation: (previousId: string, next: A9sAnnotation) => void;
}

interface UseDraftSaveFlowArgs {
  editorState: EditorStateSlice;
  viewerApiRef: React.RefObject<ViewerApi | null>;
  getPopupById: (popupId: string) => PopupRecord | null;
  updatePopupById: (popupId: string, patch: Partial<PopupRecord>) => void;
  removePopupById: (id: string) => void;
  getAnnotationKind: (annotation: A9sAnnotation) => AnnotationCreationKind;
  positionNameById: Map<number, string>;
  selectMultipleAnnotations: boolean;
  notifyLocalAnnotationCreate: (count: number) => void;
  notifyLocalAnnotationUpdate: (count: number) => void;
  activeTool: string;
  setActiveTool: (tool: 'move') => void;
  rearmCreateTool: () => void;
  tryLinkRegion: (annotation: A9sAnnotation) => boolean;
  filteredAllographId: number | undefined;
  activeAssignmentHandId: number | undefined;
  currentCreationKind: AnnotationCreationKind;
}

/**
 * The annotation create + draft-save flow, extracted from manuscript-viewer.tsx
 * (Track D1). Owns: decorating a freshly-drawn annotation with the active
 * allograph/hand/kind, the Annotorious create/update event handlers, and the
 * draft save/confirm handlers (incl. the load-bearing id-reconciliation after
 * Annotorious replaces a draft id, and bulk-apply across a multi-select).
 */
export function useDraftSaveFlow({
  editorState,
  viewerApiRef,
  getPopupById,
  updatePopupById,
  removePopupById,
  getAnnotationKind,
  positionNameById,
  selectMultipleAnnotations,
  notifyLocalAnnotationCreate,
  notifyLocalAnnotationUpdate,
  activeTool,
  setActiveTool,
  rearmCreateTool,
  tryLinkRegion,
  filteredAllographId,
  activeAssignmentHandId,
  currentCreationKind,
}: UseDraftSaveFlowArgs) {
  // Build an Annotorious payload from a popup record (merged in from the former
  // useDraftPopupBuilders — these were thin wrappers consumed only here).
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

      const selectedIds = selectMultipleAnnotations
        ? (viewerApiRef.current?.getSelectedAnnotationIds?.() ?? [])
        : [];

      const draftIds = selectedIds.filter((id) => !isDbId(id));

      return draftIds.includes(popup.annotation.id) ? draftIds : [popup.annotation.id];
    },
    [getPopupById, selectMultipleAnnotations, viewerApiRef]
  );

  // Takes a popup record directly so callers can capture it once before awaiting
  // handleSaveDraftAnnotation and not race the createAnnotation event that may
  // evict the popup at that id.
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

  const decorateCreatedAnnotation = React.useCallback(
    (annotation: A9sAnnotation): A9sWithMeta => {
      return {
        ...annotation,
        _meta: {
          ...annotation._meta,
          allographId: filteredAllographId ?? annotation._meta?.allographId,
          handId: annotation._meta?.handId ?? activeAssignmentHandId,
          annotationType: currentCreationKind,
        },
      } as A9sWithMeta;
    },
    [filteredAllographId, activeAssignmentHandId, currentCreationKind]
  );

  const handleViewerCreate = React.useCallback(
    (annotation: A9sAnnotation) => {
      // Track A — armed text→region links are handled in useImageTextLinking.
      if (tryLinkRegion(annotation)) return;

      const enriched = decorateCreatedAnnotation(annotation);

      const syncCreatedAnnotation = async () => {
        await viewerApiRef.current?.updateSelectedDraft?.(enriched);
        updatePopupById(enriched.id, { annotation: enriched });
        editorState.markCreated(enriched);
      };

      void syncCreatedAnnotation();
    },
    [tryLinkRegion, decorateCreatedAnnotation, updatePopupById, editorState, viewerApiRef]
  );

  // 60 fps modify-drag fires collapse into one trailing-edge commit (debounced
  // coalescing lives in useAnnotationEditorState).
  const handleViewerUpdate = React.useCallback(
    (annotation: A9sAnnotation) => {
      editorState.markUpdated(annotation, { debounced: true });
    },
    [editorState]
  );

  const handleSaveDraftAnnotation = React.useCallback(
    async (popupId: string) => {
      const popup = getPopupById(popupId);
      if (!popup) return;

      const previousId = popup.annotation.id;
      const isEditorial = getAnnotationKind(popup.annotation) === 'editorial';

      const next = buildPopupAnnotationPayload({ popup, isEditorial, positionNameById });

      await viewerApiRef.current?.updateSelectedDraft?.(next);

      // Capture ids just before save so we can identify the saved annotation if
      // Annotorious replaces the draft id with a persisted one. Going by "last
      // item in the post-save array" picked whatever was drawn last in bulk-draw
      // mode, not the one being saved.
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
    [getAnnotationKind, getPopupById, positionNameById, editorState, viewerApiRef]
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
        // Annotorious keeps the polygon shape locally; only _meta changed. The
        // next select event recovers canonical metadata via
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
          // handleSaveDraftAnnotation has fired createAnnotation events and the
          // popup at popupId may already have been evicted, so looking it up
          // again by id would silently drop the bulk-apply values.
          const nextAnnotations = currentAnnotations.map((annotation) => {
            if (!otherSelectedIdSet.has(annotation.id) || isDbId(annotation.id)) {
              return annotation;
            }

            return applyPopupValuesToDraftAnnotationFromRecord(annotation, popup);
          });

          // Snapshot derives from editorRecords; only the records map needs
          // updating. We don't re-seed Annotorious — its internal state for
          // these polygons is unchanged (only _meta differs).
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
      viewerApiRef,
    ]
  );

  return {
    handleViewerCreate,
    handleViewerUpdate,
    handleSaveDraftAnnotation,
    handleConfirmDraftAnnotation,
  };
}
