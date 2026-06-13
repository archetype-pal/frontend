'use client';

import * as React from 'react';

import type { ViewerApi } from '@/components/manuscript/manuscript-annotorious';
import type { ManuscriptImage as ManuscriptImageType } from '@/types/manuscript-image';
import { fetchContentSearchHits } from '@/lib/iiif-content-search';

interface UseSearchRegionTargetArgs {
  imageId: string;
  osdReady: boolean;
  manuscriptImage: ManuscriptImageType | null;
  /** Loaded annotations — used to confirm the target region is actually present. */
  a9sSnapshot: { id: string }[];
  viewerApiRef: React.RefObject<ViewerApi | null>;
}

/**
 * Search deep-link → image. When the viewer is opened with `?q=` (a text search
 * hit), ask the IIIF Content Search service which linked region(s) match and
 * select + centre the one on this image — reusing the same viewer API a phrase
 * click uses (selectAnnotationById + centerOnAnnotation). Complements the text
 * panel highlight (which marks the word in the transcription).
 *
 * One-shot per image; defers to the ?graph=/?draft= share-target so the two
 * deep-link mechanisms never fight.
 */
export function useSearchRegionTarget({
  imageId,
  osdReady,
  manuscriptImage,
  a9sSnapshot,
  viewerApiRef,
}: UseSearchRegionTargetArgs) {
  const handledRef = React.useRef(false);

  React.useEffect(() => {
    handledRef.current = false;
  }, [imageId]);

  React.useEffect(() => {
    if (handledRef.current) return;
    if (!osdReady || typeof window === 'undefined') return;
    // Guard against a stale snapshot mid-navigation: the loaded image + its
    // annotations must match the URL before we act.
    if (!manuscriptImage || String(manuscriptImage.id) !== imageId) return;
    if (!a9sSnapshot.length) return;

    const params = new URLSearchParams(window.location.search);
    const query = params.get('q');
    // No search term, or an annotation share-link owns this load → stand down.
    if (!query || params.get('graph') || params.get('draft')) {
      handledRef.current = true;
      return;
    }

    handledRef.current = true;
    let cancelled = false;
    void fetchContentSearchHits(manuscriptImage.item_part, query).then((hits) => {
      if (cancelled) return;
      const onThisImage = hits.find((hit) => hit.imageId === imageId);
      if (!onThisImage) return;
      const targetId = `db:${onThisImage.graphId}`;
      // Only act if the region is actually loaded in the viewer.
      if (!a9sSnapshot.some((annotation) => annotation.id === targetId)) return;
      viewerApiRef.current?.selectAnnotationById?.(targetId);
      viewerApiRef.current?.centerOnAnnotation?.(targetId);
    });

    return () => {
      cancelled = true;
    };
  }, [osdReady, manuscriptImage, imageId, a9sSnapshot, viewerApiRef]);
}
