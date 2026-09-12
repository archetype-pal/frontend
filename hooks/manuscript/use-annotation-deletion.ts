'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';

import { isDbId } from '@/lib/annotation-popup-utils';
import { isTextRegionAnnotation } from '@/lib/manuscript-viewer-annotation-types';
import type {
  Annotation as A9sAnnotation,
  ViewerApi,
} from '@/components/manuscript/manuscript-annotorious';
import type { ActiveViewerTool } from '@/hooks/use-viewer-editor-ui-state';
import type { A9sWithMeta, AnnotationCreationKind, PopupRecord } from '@/types/annotation-viewer';

interface UseAnnotationDeletionArgs {
  canDeleteAnnotations: boolean;
  getCanonicalAnnotation: (annotation: A9sAnnotation) => A9sWithMeta;
  getAnnotationKind: (annotation: A9sAnnotation) => AnnotationCreationKind;
  getPopupById: (popupId: string) => PopupRecord | null;
  removePopupById: (id: string) => void;
  notifyDeletedAnnotations: (annotations: A9sAnnotation[]) => void;
  markDeleted: (id: string) => void;
  viewerApiRef: React.RefObject<ViewerApi | null>;
  setActiveTool: (tool: ActiveViewerTool) => void;
}

/**
 * Annotation deletion flow, extracted from manuscript-viewer.tsx (Track D1):
 * the confirm-dialog builders and the viewer/popup delete handlers. markDeleted
 * handles both drafts (removed) and saved annotations (marked isDeleted);
 * deliberately does NOT touch initialA9sAnnots (that would re-seed the OSD layer
 * and drop in-flight selection / mid-draw polygons).
 */
export function useAnnotationDeletion({
  canDeleteAnnotations,
  getCanonicalAnnotation,
  getAnnotationKind,
  getPopupById,
  removePopupById,
  notifyDeletedAnnotations,
  markDeleted,
  viewerApiRef,
  setActiveTool,
}: UseAnnotationDeletionArgs) {
  const t = useTranslations('manuscript');

  const handleConfirmDelete = React.useCallback(
    (annotation: A9sAnnotation) => {
      const canonical = getCanonicalAnnotation(annotation);
      // Text-regions are deleted via the viewer's onDeleteTextRegion path (unlink
      // + corresp strip), dispatched once per click by the delete handler — never
      // through this glyph confirm. Refuse here so the glyph delete can't run.
      if (isTextRegionAnnotation(canonical)) return false;

      const kind = getAnnotationKind(canonical);
      const isDraft = !isDbId(canonical.id);

      return window.confirm(
        isDraft ? t('delete.draftConfirm', { kind }) : t('delete.savedConfirm', { kind })
      );
    },
    [getCanonicalAnnotation, getAnnotationKind, t]
  );

  const handleConfirmDeleteMany = React.useCallback(
    (annotations: A9sAnnotation[]) => {
      const canonical = annotations.map((annotation) => getCanonicalAnnotation(annotation));
      if (canonical.some(isTextRegionAnnotation)) return false;

      const draftCount = canonical.filter((annotation) => !isDbId(annotation.id)).length;
      const savedCount = canonical.length - draftCount;
      const counts = { total: canonical.length, draftCount, savedCount };

      // Pluralisation lives in the ICU message, not here: French does not
      // pluralise on the same boundaries as English, so an `=== 1 ? '' : 's'`
      // built in TS cannot be translated correctly.
      const message =
        draftCount > 0 && savedCount > 0
          ? t('delete.bulkMixed', counts)
          : draftCount > 0
            ? t('delete.bulkDrafts', counts)
            : t('delete.bulkSaved', counts);

      return window.confirm(message);
    },
    [getCanonicalAnnotation, t]
  );

  const handleViewerDelete = React.useCallback(
    (annotation: A9sAnnotation, context?: { bulk: boolean }) => {
      markDeleted(annotation.id);
      removePopupById(annotation.id);

      if (!context?.bulk) {
        notifyDeletedAnnotations([annotation]);
      }
    },
    [notifyDeletedAnnotations, removePopupById, markDeleted]
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
      viewerApiRef,
    ]
  );

  const handleViewerDeleteMany = React.useCallback(
    (annotations: A9sAnnotation[]) => {
      notifyDeletedAnnotations(annotations);
    },
    [notifyDeletedAnnotations]
  );

  return {
    handleConfirmDelete,
    handleConfirmDeleteMany,
    handleViewerDelete,
    handleViewerDeleteMany,
    handleDeletePopupAnnotation,
  };
}
