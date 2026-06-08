'use client';

import * as React from 'react';

import { dbIdFromA9s } from '@/lib/anno-mapping';
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
  /** Delete a text-region: removes the graph AND strips its corresp (the glyph
   *  delete would orphan the transcription reference). Same op as the panel's
   *  region Delete (unlinkSelectedRegion). */
  onDeleteTextRegion: (graphId: number) => void;
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
  onDeleteTextRegion,
}: UseAnnotationDeletionArgs) {
  const handleConfirmDelete = React.useCallback(
    (annotation: A9sAnnotation) => {
      const canonical = getCanonicalAnnotation(annotation);
      // A text-region isn't a glyph: deleting it must remove the graph AND strip
      // its corresp from the transcription. Route to unlink and return false so
      // Annotorious's glyph-delete path never runs (which would orphan the ref).
      if (isTextRegionAnnotation(canonical)) {
        const graphId = dbIdFromA9s(canonical);
        if (
          graphId != null &&
          window.confirm(
            'Delete this linked region?\n\nIt will be removed from the image and unlinked from the transcription.'
          )
        ) {
          onDeleteTextRegion(graphId);
        }
        return false;
      }

      const kind = getAnnotationKind(canonical);
      const isDraft = !isDbId(canonical.id);

      return window.confirm(
        isDraft
          ? `Delete this ${kind} draft annotation?\n\nThis will discard it locally.`
          : `Delete this saved ${kind} annotation?\n\nThis will mark it for deletion. Press Save to persist the deletion.`
      );
    },
    [getCanonicalAnnotation, getAnnotationKind, onDeleteTextRegion]
  );

  const handleConfirmDeleteMany = React.useCallback(
    (annotations: A9sAnnotation[]) => {
      const canonical = annotations.map((annotation) => getCanonicalAnnotation(annotation));
      if (canonical.some(isTextRegionAnnotation)) return false;

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
