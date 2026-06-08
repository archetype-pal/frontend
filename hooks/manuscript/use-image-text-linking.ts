'use client';

import * as React from 'react';

import { showActionNotification } from '@/components/ui/action-toast';
import { a9sToBackendFeature } from '@/lib/anno-mapping';
import { buildInitialViewerAnnotations } from '@/lib/manuscript-viewer-annotations';
import {
  fetchImageTextsForImage,
  linkRegionToElement,
  type ImageTextDetail,
} from '@/services/image-texts';
import type {
  Annotation as A9sAnnotation,
  ViewerApi,
} from '@/components/manuscript/manuscript-annotorious';
import type { ManuscriptImage as ManuscriptImageType } from '@/types/manuscript-image';

interface LinkArm {
  textId: number;
  elementIndex: number;
  label: string;
}

interface UseImageTextLinkingArgs {
  imageId: string;
  token: string | null | undefined;
  manuscriptImage: ManuscriptImageType | null;
  imageHeight: number;
  allographNameById: Map<number, string>;
  isPublicDemoMode: boolean;
  canViewEditorialControls: boolean;
  viewerApiRef: React.RefObject<ViewerApi | null>;
  resetEditorFrom: (annotations: A9sAnnotation[]) => void;
  setInitialA9sAnnots: (annotations: A9sAnnotation[]) => void;
}

/**
 * Track A/B — the transcription side panel + text↔region linking, extracted from
 * manuscript-viewer.tsx (Track D1). Owns the image-texts list, the panel
 * open/linked-span state, the "armed for linking" state (incl. its own
 * imageId-keyed reset), and the link-region create path (tryLinkRegion) that the
 * viewer's create handler defers to.
 */
export function useImageTextLinking({
  imageId,
  token,
  manuscriptImage,
  imageHeight,
  allographNameById,
  isPublicDemoMode,
  canViewEditorialControls,
  viewerApiRef,
  resetEditorFrom,
  setInitialA9sAnnots,
}: UseImageTextLinkingArgs) {
  const [imageTexts, setImageTexts] = React.useState<ImageTextDetail[]>([]);
  const [linkedGraphId, setLinkedGraphId] = React.useState<number | null>(null);
  const [linkArm, setLinkArm] = React.useState<LinkArm | null>(null);
  // Reverse flow: a region drawn first (in text mode) waits here for the user to
  // click the phrase it belongs to. The drawn draft stays on the canvas as a
  // preview until linked or cancelled.
  const [pendingLinkRegion, setPendingLinkRegion] = React.useState<A9sAnnotation | null>(null);

  const linkArmRef = React.useRef<LinkArm | null>(null);
  React.useEffect(() => {
    linkArmRef.current = linkArm;
  }, [linkArm]);

  const pendingLinkRegionRef = React.useRef<A9sAnnotation | null>(null);
  React.useEffect(() => {
    pendingLinkRegionRef.current = pendingLinkRegion;
  }, [pendingLinkRegion]);

  // Drop any armed/pending link when the image changes so a stale one from the
  // previous image can't hijack the first region drawn on the next one.
  React.useEffect(() => {
    setLinkArm(null);
    setPendingLinkRegion(null);
  }, [imageId]);

  // Load image-texts for the side panel. Whether the panel is shown is derived
  // from the viewer's view mode (see manuscript-viewer.tsx), not from text
  // presence — so the default Allograph view stays uncluttered.
  React.useEffect(() => {
    let active = true;
    fetchImageTextsForImage(imageId, token)
      .then((texts) => {
        if (!active) return;
        setImageTexts(texts);
      })
      .catch(() => {
        if (active) setImageTexts([]);
      });
    return () => {
      active = false;
    };
  }, [imageId, token]);

  // Reload image-texts + re-seed annotations after a server-side change (used by
  // the link-region flow so the new region + corresp appear).
  const reloadTextsAndAnnotations = React.useCallback(async () => {
    if (!manuscriptImage || !imageHeight) return;
    const [texts, refreshed] = await Promise.all([
      fetchImageTextsForImage(imageId, token).catch(() => null),
      buildInitialViewerAnnotations({
        itemImageId: String(manuscriptImage.id),
        iiifImage: manuscriptImage.iiif_image,
        imageHeight,
        allographNameById,
        isPublicDemoMode,
        includeEditorial: canViewEditorialControls,
        includeText: true,
        token,
        // Preserve any in-progress local drafts across the post-link reseed
        // (the merge keeps non-db drafts; passing [] would silently drop them).
        currentViewerAnnotations: viewerApiRef.current?.getAnnotations?.() ?? [],
        currentUrl: '',
      }).catch(() => null),
    ]);
    if (texts) setImageTexts(texts);
    if (refreshed) {
      setInitialA9sAnnots(refreshed);
      resetEditorFrom(refreshed);
    }
  }, [
    manuscriptImage,
    imageHeight,
    imageId,
    token,
    allographNameById,
    isPublicDemoMode,
    canViewEditorialControls,
    viewerApiRef,
    resetEditorFrom,
    setInitialA9sAnnots,
  ]);

  // If a phrase is armed for linking, a drawn region becomes a server-side TEXT
  // graph linked to that element rather than a local draft. Returns true when it
  // handled the create (so the caller skips its normal draft path).
  const tryLinkRegion = React.useCallback(
    (annotation: A9sAnnotation): boolean => {
      const arm = linkArmRef.current;
      if (!(arm && token && imageHeight)) return false;

      const geometry = a9sToBackendFeature(annotation, imageHeight);
      void (async () => {
        try {
          await linkRegionToElement(token, arm.textId, arm.elementIndex, geometry);
          viewerApiRef.current?.removeAnnotationById?.(annotation.id);
          setLinkArm(null);
          await reloadTextsAndAnnotations();
          showActionNotification({
            kind: 'created',
            title: 'Region linked',
            description: `Linked a region to “${arm.label}”.`,
            duration: 2200,
          });
        } catch (error) {
          viewerApiRef.current?.removeAnnotationById?.(annotation.id);
          showActionNotification({
            kind: 'error',
            title: 'Link failed',
            description:
              error instanceof Error ? error.message.slice(0, 160) : 'Could not link region.',
          });
        }
      })();
      return true;
    },
    [token, imageHeight, viewerApiRef, reloadTextsAndAnnotations]
  );

  // Reverse flow — a region drawn before a phrase is chosen. The viewer's create
  // handler calls this (in pure text mode, when nothing is armed) instead of the
  // glyph draft path; the drawn draft is kept on the canvas as a preview.
  const startPendingLink = React.useCallback(
    (annotation: A9sAnnotation) => {
      const existing = pendingLinkRegionRef.current;
      if (existing && existing.id !== annotation.id) {
        viewerApiRef.current?.removeAnnotationById?.(existing.id);
      }
      setPendingLinkRegion(annotation);
    },
    [viewerApiRef]
  );

  // Link the pending region to the phrase the user just clicked.
  const linkPendingToPhrase = React.useCallback(
    (textId: number, elementIndex: number, label: string) => {
      const region = pendingLinkRegionRef.current;
      if (!(region && token && imageHeight)) return;
      const geometry = a9sToBackendFeature(region, imageHeight);
      void (async () => {
        try {
          await linkRegionToElement(token, textId, elementIndex, geometry);
          viewerApiRef.current?.removeAnnotationById?.(region.id);
          setPendingLinkRegion(null);
          await reloadTextsAndAnnotations();
          showActionNotification({
            kind: 'created',
            title: 'Region linked',
            description: `Linked a region to “${label}”.`,
            duration: 2200,
          });
        } catch (error) {
          viewerApiRef.current?.removeAnnotationById?.(region.id);
          setPendingLinkRegion(null);
          showActionNotification({
            kind: 'error',
            title: 'Link failed',
            description:
              error instanceof Error ? error.message.slice(0, 160) : 'Could not link region.',
          });
        }
      })();
    },
    [token, imageHeight, viewerApiRef, reloadTextsAndAnnotations]
  );

  const cancelPendingLink = React.useCallback(() => {
    const region = pendingLinkRegionRef.current;
    if (region) viewerApiRef.current?.removeAnnotationById?.(region.id);
    setPendingLinkRegion(null);
  }, [viewerApiRef]);

  return {
    imageTexts,
    linkedGraphId,
    setLinkedGraphId,
    linkArm,
    setLinkArm,
    tryLinkRegion,
    reloadTextsAndAnnotations,
    pendingLinkRegion,
    startPendingLink,
    linkPendingToPhrase,
    cancelPendingLink,
  };
}
