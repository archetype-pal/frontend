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
import { isTextRegionAnnotation } from '@/lib/manuscript-viewer-annotation-types';
import type {
  Annotation as A9sAnnotation,
  ViewerApi,
} from '@/components/manuscript/manuscript-annotorious';
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
  /** The working allograph copied into a newly-drawn graph (set at the top bar). */
  filteredAllographId: number | undefined;
  activeAssignmentHandId: number | undefined;
  setHoveredAnnotationId: (id: string | null) => void;
  setSelectedAnnotationIds: React.Dispatch<React.SetStateAction<string[]>>;
  setLinkedGraphId: React.Dispatch<React.SetStateAction<number | null>>;
  /** Track A — set when a *linked region* is selected on the image (region-click
   *  only); drives the text panel's Delete affordance. Cleared for glyphs/deselect. */
  setSelectedRegionGraphId: React.Dispatch<React.SetStateAction<number | null>>;
  // derived
  allographNameById: Map<number, string>;
  getCanonicalAnnotation: (annotation: A9sAnnotation) => A9sWithMeta;
  // settings
  allowMultipleBoxes: boolean;
  selectMultipleAnnotations: boolean;
  /** Pure text view: a freshly-drawn region is a pending text link, not a glyph,
   *  so its auto-select must not open the allograph popup. */
  textLinkingActive: boolean;
  /** Link an armed phrase to a freshly-drawn region. Returns true if it handled
   *  the draw (a phrase was armed). Fires on createSelection — the draw event. */
  tryLinkRegion: (annotation: A9sAnnotation) => boolean;
  /** Hold a freshly-drawn region pending until the user clicks its phrase. */
  startPendingLink: (annotation: A9sAnnotation) => void;
  /** True when the id is the region currently pending a text link. The pending
   *  box is always a text region — routing by identity (not by its `_meta`
   *  type, which can be lost across the Annotorious round-trip) is what keeps
   *  re-selecting it from misfiring the glyph popup. */
  isPendingLinkRegionId: (id: string) => boolean;
}

/**
 * Popup selection + lifecycle, extracted from manuscript-viewer.tsx (Track D1).
 * Owns the open/clear/close path for the annotation popup collection, the
 * Annotorious select handler (incl. the region→text highlight and the
 * "selection updated" toast), the multi-select id sync, and the trivial
 * draft-field cascades (tab/allograph/hand). Internally owns the debounced
 * popup-clear timer since every consumer of it lives here; cancelPendingPopupClear
 * is returned for the move-tool reset that still lives in the component.
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
  filteredAllographId,
  activeAssignmentHandId,
  setHoveredAnnotationId,
  setSelectedAnnotationIds,
  setLinkedGraphId,
  setSelectedRegionGraphId,
  allographNameById,
  getCanonicalAnnotation,
  allowMultipleBoxes,
  selectMultipleAnnotations,
  textLinkingActive,
  tryLinkRegion,
  startPendingLink,
  isPendingLinkRegionId,
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

  // Debounced single-popup clear: Annotorious can fire a deselect immediately
  // before a reselect, so we clear on a 50ms timer (cancelled by the next
  // select) to avoid the popup flickering closed-then-open. The ref keeps the
  // callbacks stable (empty deps) so consumers' dependency arrays don't churn.
  const pendingClearTimer = React.useRef<number | null>(null);
  const onPendingClearRef = React.useRef(() => clearSinglePopupState({ clearHover: true }));
  React.useEffect(() => {
    onPendingClearRef.current = () => clearSinglePopupState({ clearHover: true });
  });

  const cancelPendingPopupClear = React.useCallback(() => {
    if (pendingClearTimer.current !== null) {
      window.clearTimeout(pendingClearTimer.current);
      pendingClearTimer.current = null;
    }
  }, []);

  const schedulePopupClear = React.useCallback(() => {
    pendingClearTimer.current = window.setTimeout(() => {
      pendingClearTimer.current = null;
      onPendingClearRef.current();
    }, 50);
  }, []);

  React.useEffect(
    () => () => {
      if (pendingClearTimer.current !== null) {
        window.clearTimeout(pendingClearTimer.current);
      }
    },
    []
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

      if (isTextRegionAnnotation(annotation)) {
        clearSinglePopupState({ clearHover: options?.clearHover });
        return;
      }

      if (options?.clearHover) {
        setHoveredAnnotationId(null);
      }

      const isDraft = !isDbId(annotation.id);
      const draftAnnotationType = annotation._meta?.annotationType ?? currentCreationKind;
      const shouldAssignStandardDefaults = draftAnnotationType !== 'editorial';

      const annotationForPopup: A9sWithMeta =
        isDraft && activeTool === 'draw'
          ? ({
              ...annotation,
              _meta: {
                ...annotation._meta,
                allographId:
                  annotation._meta?.allographId ??
                  (shouldAssignStandardDefaults ? filteredAllographId : undefined),
                handId:
                  annotation._meta?.handId ??
                  (shouldAssignStandardDefaults ? activeAssignmentHandId : undefined),
                annotationType: draftAnnotationType,
              },
            } as A9sWithMeta)
          : annotation;

      const defaultPopupTab: PopupRecord['popupTab'] =
        annotationForPopup._meta?.annotationType === 'editorial' && isDraft ? 'notes' : 'details';

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
      clearSinglePopupState,
      currentCreationKind,
      filteredAllographId,
      openPopupCollectionFromAnnotation,
      activeAssignmentHandId,
      allowMultipleBoxes,
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

  const handleSelectAnnotationFromViewer = React.useCallback(
    (annotation: A9sAnnotation | null) => {
      cancelPendingPopupClear();

      const selected = annotation ? getCanonicalAnnotation(annotation) : null;

      // region → text: highlight the matching span(s) in the side panel.
      setLinkedGraphId(selected ? (dbIdFromA9s(selected) ?? null) : null);

      // Track the selected region (region-click only) so the text panel can
      // offer Delete; cleared for glyph selections and deselects. A box pending a
      // text link counts as a text region by identity even before its `_meta`
      // type has propagated, so re-selecting it never opens the glyph popup.
      const isTextRegion =
        selected != null &&
        (isTextRegionAnnotation(selected) || isPendingLinkRegionId(selected.id));
      setSelectedRegionGraphId(isTextRegion ? (dbIdFromA9s(selected) ?? null) : null);

      if (selected) {
        if (isTextRegion) {
          dismissActionNotification(ANNOTATION_SELECTION_TOAST_ID);
          clearSinglePopupState({ clearHover: true });
          return;
        }

        // A freshly drawn region (non-db draft) becomes a text↔region link, not
        // a glyph. This MUST happen here, on Annotorious's createSelection (the
        // draw event): createAnnotation only fires when a glyph draft is saved
        // via the allograph popup, which we never open for a link. If a phrase
        // is armed, link it now (works in text AND both view); otherwise, in
        // pure text view, hold the region pending until a phrase is clicked.
        if (!isDbId(selected.id)) {
          if (tryLinkRegion(selected)) {
            dismissActionNotification(ANNOTATION_SELECTION_TOAST_ID);
            return;
          }
          if (textLinkingActive) {
            dismissActionNotification(ANNOTATION_SELECTION_TOAST_ID);
            startPendingLink(selected);
            return;
          }
        }

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
      clearSinglePopupState,
      getCanonicalAnnotation,
      openSinglePopupFromAnnotation,
      setLinkedGraphId,
      setSelectedRegionGraphId,
      selectMultipleAnnotations,
      textLinkingActive,
      tryLinkRegion,
      startPendingLink,
      isPendingLinkRegionId,
    ]
  );

  return {
    handleSelectionIdsChange,
    handlePopupTabChange,
    handleDraftAllographIdChange,
    handleDraftHandIdChange,
    openSinglePopupFromAnnotation,
    closeDraftPopup,
    handleSelectAnnotationFromViewer,
    cancelPendingPopupClear,
  };
}
