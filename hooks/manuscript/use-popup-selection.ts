'use client';

import * as React from 'react';

import { dismissActionNotification, showActionNotification } from '@/components/ui/action-toast';
import { dbIdFromA9s } from '@/lib/anno-mapping';
import { isDbId } from '@/lib/annotation-popup-utils';
import {
  getAllographBodyText,
  getEditorialInternalNote,
  getStandardAnnotationNote,
} from '@/lib/annotation-notes';
import { annotationCountLabel } from '@/lib/manuscript-viewer-collection';
import { usePendingPopupClear } from '@/hooks/manuscript/use-pending-popup-clear';
import type {
  Annotation as A9sAnnotation,
  ViewerApi,
} from '@/components/manuscript/manuscript-annotorious';
import type { Allograph } from '@/types/allographs';
import type { A9sWithMeta, AnnotationCreationKind, PopupRecord } from '@/types/annotation-viewer';

const ANNOTATION_SELECTION_TOAST_ID = 'annotation-selection-toast';

interface UsePopupSelectionArgs {
  // popup collection (useManuscriptPopups)
  openPopupCollectionFromAnnotation: (
    annotation: A9sWithMeta | null,
    options?: {
      mode?: 'append' | 'replace';
      overrides?: Partial<Omit<PopupRecord, 'id' | 'annotation'>>;
    }
  ) => void;
  clearPopupCollection: () => void;
  getPopupById: (popupId: string) => PopupRecord | null;
  removePopupById: (id: string) => void;
  updatePopupById: (popupId: string, patch: Partial<PopupRecord>) => void;
  // viewer api + tool state
  viewerApiRef: React.RefObject<ViewerApi | null>;
  activeTool: string;
  setActiveTool: (tool: 'move') => void;
  rearmCreateTool: () => void;
  // editor ui state
  currentCreationKind: AnnotationCreationKind;
  canViewEditorialControls: boolean;
  filteredAllographId: number | undefined;
  setFilteredAllograph: React.Dispatch<React.SetStateAction<Allograph | undefined>>;
  activeAssignmentHandId: number | undefined;
  setHoveredAnnotationId: (id: string | null) => void;
  setSelectedAnnotationIds: React.Dispatch<React.SetStateAction<string[]>>;
  setLinkedGraphId: React.Dispatch<React.SetStateAction<number | null>>;
  // derived
  allographNameById: Map<number, string>;
  getCanonicalAnnotation: (annotation: A9sAnnotation) => A9sWithMeta;
  // settings
  allowMultipleBoxes: boolean;
  selectMultipleAnnotations: boolean;
}

/**
 * Popup selection + lifecycle, extracted from manuscript-viewer.tsx (Track D1).
 * Owns the open/clear/close path for the annotation popup collection, the
 * Annotorious select handler (incl. the region→text highlight and the
 * "selection updated" toast), the multi-select id sync, and the trivial
 * draft-field cascades (tab/allograph/hand). Internally owns the debounced
 * popup-clear timer (usePendingPopupClear) since every consumer of it lives
 * here; cancelPendingPopupClear is returned for the move-tool reset that still
 * lives in the component.
 *
 * Provides openSinglePopupFromAnnotation, which useShareTarget consumes — so
 * this hook must be called before useShareTarget in the component.
 */
export function usePopupSelection({
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
  canViewEditorialControls,
  filteredAllographId,
  setFilteredAllograph,
  activeAssignmentHandId,
  setHoveredAnnotationId,
  setSelectedAnnotationIds,
  setLinkedGraphId,
  allographNameById,
  getCanonicalAnnotation,
  allowMultipleBoxes,
  selectMultipleAnnotations,
}: UsePopupSelectionArgs) {
  const handleSelectionIdsChange = React.useCallback(
    (ids: string[]) => {
      setSelectedAnnotationIds(ids);

      if (!selectMultipleAnnotations) return;

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
    [selectMultipleAnnotations, setSelectedAnnotationIds]
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
  // graphcomponentSet) live in AnnotationPopupLayer where they're inlined via
  // updatePopupById. Only the non-trivial cascade — change allograph clears
  // related fields — stays here.

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
                allographId: annotation._meta?.allographId ?? filteredAllographId,
                handId: annotation._meta?.handId ?? activeAssignmentHandId,
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
        mode: isDraft ? 'replace' : allowMultipleBoxes ? 'append' : 'replace',
        overrides: commonOverrides,
      });
    },
    [
      activeTool,
      canViewEditorialControls,
      clearSinglePopupState,
      currentCreationKind,
      filteredAllographId,
      openPopupCollectionFromAnnotation,
      activeAssignmentHandId,
      allowMultipleBoxes,
      setFilteredAllograph,
      setHoveredAnnotationId,
    ]
  );

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
      viewerApiRef,
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

        if (!selectMultipleAnnotations) {
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
      setLinkedGraphId,
      selectMultipleAnnotations,
    ]
  );

  return {
    handleSelectionIdsChange,
    clearSinglePopupState,
    handlePopupTabChange,
    handleDraftAllographIdChange,
    handleDraftHandIdChange,
    openSinglePopupFromAnnotation,
    closeDraftPopup,
    handleCloseSelectedAnnotation,
    handleCancelDraftAnnotation,
    handleSelectAnnotationFromViewer,
    cancelPendingPopupClear,
  };
}
