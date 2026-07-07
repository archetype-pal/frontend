'use client';

import * as React from 'react';

import { showActionNotification } from '@/components/ui/action-toast';
import { a9sToBackendFeature, dbIdFromA9s } from '@/lib/anno-mapping';
import { buildInitialViewerAnnotations } from '@/lib/manuscript-viewer-annotations';
import { updateViewerAnnotation } from '@/services/annotations';
import {
  fetchImageTextsForImage,
  linkRegionToElement,
  unlinkElement,
  unlinkRegion,
  type ImageTextDetail,
} from '@/services/image-texts';
import type {
  Annotation as A9sAnnotation,
  ViewerApi,
} from '@/components/manuscript/manuscript-annotorious';
import type { ManuscriptImage as ManuscriptImageType } from '@/types/manuscript-image';
import type { A9sWithMeta } from '@/types/annotation-viewer';

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
 * Tag a freshly drawn box as a text-region draft so the visibility filter treats
 * it as the text layer immediately — before the link round-trips server-side
 * (used by startPendingLink when a region is drawn in text mode). Typing at draw
 * time is what lets the filter gate visibility purely on layer instead of on
 * persistence state (see passesVisibilityFilter).
 */
export function toTextRegionDraft(annotation: A9sAnnotation): A9sAnnotation {
  return {
    ...annotation,
    _meta: { ...(annotation as A9sWithMeta)._meta, annotationType: 'text' as const },
  } as A9sAnnotation;
}

/**
 * Track A/B — the transcription side panel + text↔region linking, extracted from
 * manuscript-viewer.tsx (Track D1). Owns the image-texts list, the panel
 * open/linked-span/selected-region state (incl. its own imageId-keyed reset), and
 * the link/unlink paths: the drawn-region create flow (startPendingLink →
 * linkPendingToPhrase) and the explicit Link Bar path (linkExistingRegionToElement).
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
  // Graph id of a *linked region selected on the image* (region-click only, not
  // a phrase click) — drives the text panel's "selected region" actions (Delete).
  const [selectedRegionGraphId, setSelectedRegionGraphId] = React.useState<number | null>(null);
  // Reverse flow: a region drawn first (in text mode) waits here for the user to
  // click the phrase it belongs to. The drawn draft stays on the canvas as a
  // preview until linked or cancelled.
  const [pendingLinkRegion, setPendingLinkRegion] = React.useState<A9sAnnotation | null>(null);
  // Graph id of the region the pointer is *hovering* on the image (null when
  // none). Drives the text panel's "highlight the linked phrase on region hover"
  // affordance — the image→text mirror of onSpanHover. Transient: cleared on
  // pointer-leave and on image change; never persisted.
  const [hoveredRegionGraphId, setHoveredRegionGraphId] = React.useState<number | null>(null);

  const pendingLinkRegionRef = React.useRef<A9sAnnotation | null>(null);
  React.useEffect(() => {
    pendingLinkRegionRef.current = pendingLinkRegion;
  }, [pendingLinkRegion]);

  // The drawn box is held as a live Annotorious selection whose `_meta` type can
  // be lost across the async update/re-seed round-trip. Routing the selection
  // handler by *identity* (is this id the pending region?) instead of by inferred
  // type makes "draw a region in text mode" reliably a text link and never the
  // glyph popup. Reads the ref so it stays stable (empty deps).
  const isPendingLinkRegionId = React.useCallback(
    (id: string) => pendingLinkRegionRef.current?.id === id,
    []
  );

  // Drop any pending link when the image changes so a stale one from the previous
  // image can't hijack the first region drawn on the next one. This is the React
  // "adjust state during render when a prop changes" pattern (a `key` reset isn't
  // available — the imageId boundary lives in the parent), guarded by a
  // previous-imageId tracker so it runs exactly once per image change. The
  // pendingLinkRegionRef mirror stays in sync via its own effect after this
  // re-render, identical to the prior effect-based reset.
  const [prevImageId, setPrevImageId] = React.useState(imageId);
  if (prevImageId !== imageId) {
    setPrevImageId(imageId);
    setPendingLinkRegion(null);
    setSelectedRegionGraphId(null);
    setHoveredRegionGraphId(null);
  }

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

  // A region drawn in pure text mode, before a phrase is chosen. The viewer's
  // create handler calls this instead of the glyph draft path; the drawn draft is
  // kept on the canvas as a preview until a phrase is clicked (linkPendingToPhrase).
  const startPendingLink = React.useCallback(
    (annotation: A9sAnnotation) => {
      const existing = pendingLinkRegionRef.current;
      if (existing && existing.id !== annotation.id) {
        viewerApiRef.current?.removeAnnotationById?.(existing.id);
      }
      // Type the preview as a text-region immediately — before it's linked
      // server-side — so every guard (the popup sink, the select handler, the
      // visibility filter) treats it as one. Otherwise an un-linked drawn box is
      // "untyped" and could open the glyph popup if re-selected after a view-mode
      // switch. We also push the type onto the canvas copy so Annotorious re-emits
      // it typed on re-select.
      const typed = toTextRegionDraft(annotation);
      void viewerApiRef.current?.updateSelectedDraft?.(typed);
      // Set the ref synchronously (not just via the effect) so a re-select that
      // fires before the next render still routes this box as the pending link.
      pendingLinkRegionRef.current = typed;
      setPendingLinkRegion(typed);
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
          pendingLinkRegionRef.current = null;
          setPendingLinkRegion(null);
          await reloadTextsAndAnnotations();
          showActionNotification({
            kind: 'saved',
            title: 'Region linked & saved',
            description: `Saved automatically — “${label}”.`,
            duration: 3000,
          });
        } catch (error) {
          viewerApiRef.current?.removeAnnotationById?.(region.id);
          pendingLinkRegionRef.current = null;
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
    // The drawn box is owned by React state and folded into the rendered set, so
    // it is BOTH a live Annotorious selection and a committed annotation. Tear
    // down only the selection (clearSelection → cancelSelected, which also rearms
    // the draw tool) and let clearing the state re-seed it away. Calling
    // removeAnnotation on the still-selected box instead left Annotorious's
    // selection subsystem half-disposed, which silently blocked the next draw.
    pendingLinkRegionRef.current = null;
    viewerApiRef.current?.clearSelection?.();
    setPendingLinkRegion(null);
  }, [viewerApiRef]);

  // Explicit Link Bar path: link an EXISTING region (by graph id) to an element,
  // taking the region id directly (the bar links the region the user selected on
  // the image).
  const linkExistingRegionToElement = React.useCallback(
    (textId: number, elementIndex: number, graphId: number, label: string) => {
      if (!token) return;
      void (async () => {
        try {
          await linkRegionToElement(token, textId, elementIndex, undefined, graphId);
          await reloadTextsAndAnnotations();
          showActionNotification({
            kind: 'saved',
            title: 'Linked',
            description: `Linked “${label}” to the region.`,
            duration: 2500,
          });
        } catch (error) {
          showActionNotification({
            kind: 'error',
            title: 'Link failed',
            description:
              error instanceof Error ? error.message.slice(0, 160) : 'Could not link region.',
          });
        }
      })();
    },
    [token, reloadTextsAndAnnotations]
  );

  // Delete a selected linked region: removes the TEXT graph + strips its
  // corresp from this image's texts (the endpoint accepts any of the image's
  // text ids and clears the ref from all of them).
  const unlinkSelectedRegion = React.useCallback(
    (graphId: number) => {
      const anyTextId = imageTexts[0]?.id;
      if (!(token && anyTextId)) return;
      // Drop the box from the canvas up front. removeAnnotationById → the lib's
      // removeAnnotation deselects a selected shape synchronously before dropping
      // it, so a region deleted while it is the live selection (the panel
      // "Delete", which selects the region first) is removed cleanly instead of
      // being re-added by an async deselect after the re-seed — the bug where the
      // graph stayed visible on the image even though it was deleted server-side.
      setSelectedRegionGraphId(null);
      setLinkedGraphId(null);
      viewerApiRef.current?.removeAnnotationById?.(`db:${graphId}`);
      void (async () => {
        try {
          await unlinkRegion(token, anyTextId, graphId);
          await reloadTextsAndAnnotations();
          showActionNotification({
            kind: 'deleted',
            title: 'Region unlinked',
            description: 'Removed the region and its link.',
            duration: 2200,
          });
        } catch (error) {
          showActionNotification({
            kind: 'error',
            title: 'Unlink failed',
            description:
              error instanceof Error ? error.message.slice(0, 160) : 'Could not unlink region.',
          });
        }
      })();
    },
    [token, imageTexts, viewerApiRef, reloadTextsAndAnnotations]
  );

  // Per-element unlink: strip just this element's ref to a region, keeping the
  // region graph and its other links (vs unlinkSelectedRegion, which deletes the
  // whole region). The region stays on the canvas — no removeAnnotationById.
  const unlinkElementFromRegion = React.useCallback(
    (textId: number, elementIndex: number, graphId: number) => {
      if (!token) return;
      void (async () => {
        try {
          await unlinkElement(token, textId, elementIndex, graphId);
          await reloadTextsAndAnnotations();
          showActionNotification({
            kind: 'deleted',
            title: 'Link removed',
            description: 'Removed this phrase’s link to the region.',
            duration: 1800,
          });
        } catch (error) {
          showActionNotification({
            kind: 'error',
            title: 'Unlink failed',
            description:
              error instanceof Error ? error.message.slice(0, 160) : 'Could not remove the link.',
          });
        }
      })();
    },
    [token, reloadTextsAndAnnotations]
  );

  // Persist a region reshape (Modify): PATCH the TEXT graph's geometry. The
  // corresp/link is unaffected, so no text reload is needed.
  const persistRegionGeometry = React.useCallback(
    (annotation: A9sAnnotation) => {
      const graphId = dbIdFromA9s(annotation);
      if (!(graphId && token && imageHeight)) return;
      const geometry = a9sToBackendFeature(annotation, imageHeight);
      void updateViewerAnnotation(token, graphId, { annotation: geometry })
        .then(() =>
          showActionNotification({
            kind: 'updated',
            title: 'Region reshaped',
            description: 'Saved the region’s new shape.',
            duration: 1600,
          })
        )
        .catch((error) =>
          showActionNotification({
            kind: 'error',
            title: 'Reshape failed',
            description:
              error instanceof Error ? error.message.slice(0, 160) : 'Could not save the region.',
          })
        );
    },
    [token, imageHeight]
  );

  return {
    imageTexts,
    linkedGraphId,
    setLinkedGraphId,
    reloadTextsAndAnnotations,
    pendingLinkRegion,
    isPendingLinkRegionId,
    startPendingLink,
    linkPendingToPhrase,
    cancelPendingLink,
    selectedRegionGraphId,
    setSelectedRegionGraphId,
    hoveredRegionGraphId,
    setHoveredRegionGraphId,
    unlinkSelectedRegion,
    unlinkElementFromRegion,
    linkExistingRegionToElement,
    persistRegionGeometry,
  };
}
