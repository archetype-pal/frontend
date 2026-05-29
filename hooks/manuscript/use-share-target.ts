'use client';

import * as React from 'react';

import {
  decodeDraftSharePayload,
  encodeDraftSharePayload,
  isDbId,
} from '@/lib/annotation-popup-utils';
import { buildStandardAnnotationBody } from '@/lib/annotation-notes';
import type {
  Annotation as A9sAnnotation,
  ViewerApi,
} from '@/components/manuscript/manuscript-annotorious';
import type { ManuscriptImage as ManuscriptImageType } from '@/types/manuscript-image';
import type {
  A9sWithMeta,
  AnnotationCreationKind,
  DraftSharePayload,
  PopupRecord,
} from '@/types/annotation-viewer';

interface UseShareTargetArgs {
  imageId: string;
  osdReady: boolean;
  manuscriptImage: ManuscriptImageType | null;
  a9sSnapshot: A9sAnnotation[];
  viewerApiRef: React.RefObject<ViewerApi | null>;
  openSinglePopupFromAnnotation: (
    annotation: A9sWithMeta | null,
    options?: { clearHover?: boolean }
  ) => void;
  getPopupById: (popupId: string) => PopupRecord | null;
  updatePopupById: (popupId: string, patch: Partial<PopupRecord>) => void;
  getAnnotationKind: (annotation: A9sAnnotation) => AnnotationCreationKind;
}

/**
 * Citable-annotation share + deep-link, extracted from manuscript-viewer.tsx
 * (Track D1): building/copying a ?graph=… or ?draft=… share URL for a popup, and
 * the first-load effect that opens + centres the annotation named in the URL.
 * Owns the once-per-image "handled" guard and its imageId-keyed reset.
 */
export function useShareTarget({
  imageId,
  osdReady,
  manuscriptImage,
  a9sSnapshot,
  viewerApiRef,
  openSinglePopupFromAnnotation,
  getPopupById,
  updatePopupById,
  getAnnotationKind,
}: UseShareTargetArgs) {
  const initialGraphHandledRef = React.useRef(false);

  // Re-arm on image change so ?graph=/?draft= is honoured on the new image
  // (the same viewer instance is reused when navigating via next/link).
  React.useEffect(() => {
    initialGraphHandledRef.current = false;
  }, [imageId]);

  const handleHideShareUrl = React.useCallback(
    (popupId: string) => {
      updatePopupById(popupId, { isShareUrlVisible: false });
    },
    [updatePopupById]
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

  const handleCopyShareUrl = React.useCallback(
    async (popupId: string) => {
      const value = getPopupById(popupId)?.shareUrl ?? '';
      if (!value) return;

      try {
        await navigator.clipboard.writeText(value);
      } catch {
        // ignore
      }
    },
    [getPopupById]
  );

  // open shared ?graph=… / ?draft=… annotation on first valid load
  React.useEffect(() => {
    if (initialGraphHandledRef.current) return;
    if (!osdReady || typeof window === 'undefined') return;
    // Guard against a stale snapshot mid-navigation: only proceed once the
    // loaded image actually matches the URL.
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
  }, [
    osdReady,
    a9sSnapshot,
    openSinglePopupFromAnnotation,
    manuscriptImage,
    imageId,
    viewerApiRef,
  ]);

  return { handleHideShareUrl, handleShareSelectedAnnotation, handleCopyShareUrl };
}
