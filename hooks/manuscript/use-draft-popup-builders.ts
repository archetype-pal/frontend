'use client';

import * as React from 'react';

import { isDbId } from '@/lib/annotation-popup-utils';
import { buildPopupAnnotationPayload } from '@/lib/manuscript-viewer-popup-utils';
import type {
  Annotation as A9sAnnotation,
  ViewerApi,
} from '@/components/manuscript/manuscript-annotorious';
import type { PopupRecord } from '@/types/annotation-viewer';

interface UseDraftPopupBuildersArgs {
  getPopupById: (popupId: string) => PopupRecord | null;
  positionNameById: Map<number, string>;
  selectMultipleAnnotations: boolean;
  viewerApiRef: React.RefObject<ViewerApi | null>;
}

/**
 * Builders that turn a popup record into an Annotorious annotation payload,
 * extracted from manuscript-viewer.tsx (Track D1). Thin wrappers over
 * buildPopupAnnotationPayload; consumed by the save/confirm flow.
 */
export function useDraftPopupBuilders({
  getPopupById,
  positionNameById,
  selectMultipleAnnotations,
  viewerApiRef,
}: UseDraftPopupBuildersArgs) {
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

  return {
    buildStandardAnnotationFromPopup,
    buildEditorialAnnotationFromPopup,
    getSelectedDraftIdsForPopup,
    applyPopupValuesToDraftAnnotationFromRecord,
  };
}
