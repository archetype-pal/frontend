'use client';

import * as React from 'react';

import { formatAllographLabel } from '@/lib/allograph-labels';
import { isGlyphAnnotation } from '@/lib/manuscript-viewer-annotation-types';
import type {
  Annotation as A9sAnnotation,
  ViewerApi,
} from '@/components/manuscript/manuscript-annotorious';
import type { Allograph } from '@/types/allographs';
import type { HandType } from '@/types/hands';
import type { A9sWithMeta } from '@/types/annotation-viewer';

interface UseViewerHighlightsArgs {
  a9sSnapshot: A9sAnnotation[];
  filteredAllograph: Allograph | undefined;
  hoveredAllograph: Allograph | undefined;
  selectedHand: HandType | null | undefined;
  popupAnnotationId: string | undefined;
  hoveredAnnotationId: string | null | undefined;
  selectedRegionGraphId: number | null | undefined;
  osdReady: boolean;
  viewerApiRef: React.RefObject<ViewerApi | null>;
}

/**
 * Which annotations are highlighted in the image, and the label/count the
 * header shows for them. The allograph-filter, hand-filter, hover and
 * selected-region sources are resolved here in one place and pushed into OSD,
 * so no caller has to know their precedence.
 */
export function useViewerHighlights({
  a9sSnapshot,
  filteredAllograph,
  hoveredAllograph,
  selectedHand,
  popupAnnotationId,
  hoveredAnnotationId,
  selectedRegionGraphId,
  osdReady,
  viewerApiRef,
}: UseViewerHighlightsArgs) {
  const displayAllograph = hoveredAllograph ?? filteredAllograph ?? undefined;
  const activeAllographLabel = displayAllograph
    ? formatAllographLabel(displayAllograph)
    : undefined;
  const countAllographId = displayAllograph?.id ?? null;
  const highlightAllographId = hoveredAllograph?.id ?? filteredAllograph?.id ?? null;

  const filteredA9s = React.useMemo(() => {
    if (countAllographId == null) return [];
    return a9sSnapshot.filter(
      (a) => isGlyphAnnotation(a) && (a as A9sWithMeta)._meta?.allographId === countAllographId
    );
  }, [a9sSnapshot, countAllographId]);

  const highlightedIds = React.useMemo(() => {
    if (highlightAllographId != null) {
      return a9sSnapshot
        .filter(
          (a) =>
            isGlyphAnnotation(a) &&
            (a as A9sWithMeta)._meta?.allographId === highlightAllographId &&
            a.id !== popupAnnotationId
        )
        .map((a) => a.id);
    }

    if (selectedHand?.id != null) {
      return a9sSnapshot
        .filter(
          (a) =>
            isGlyphAnnotation(a) &&
            (a as A9sWithMeta)._meta?.handId === selectedHand.id &&
            a.id !== popupAnnotationId
        )
        .map((a) => a.id);
    }

    return [];
  }, [a9sSnapshot, highlightAllographId, popupAnnotationId, selectedHand?.id]);

  // Push the derived highlight state into the OSD viewer.
  React.useEffect(() => {
    if (!osdReady) return;

    // A region clicked on the image stays highlighted until it's deselected, so
    // its link (in the Link bar) has a persistent visual anchor. Hover and the
    // allograph-filter layer their transient highlights on top of it.
    const selectedRegionId = selectedRegionGraphId != null ? `db:${selectedRegionGraphId}` : null;
    const withSelectedRegion = (ids: string[]) =>
      selectedRegionId ? Array.from(new Set([selectedRegionId, ...ids])) : ids;

    if (hoveredAnnotationId) {
      viewerApiRef.current?.highlightAnnotations?.(withSelectedRegion([hoveredAnnotationId]));
      return;
    }

    if (highlightAllographId == null) {
      if (selectedRegionId) {
        viewerApiRef.current?.highlightAnnotations?.([selectedRegionId]);
      } else {
        viewerApiRef.current?.clearHighlights?.();
      }
      return;
    }

    viewerApiRef.current?.highlightAnnotations?.(withSelectedRegion(highlightedIds));
  }, [
    osdReady,
    hoveredAnnotationId,
    highlightAllographId,
    highlightedIds,
    selectedRegionGraphId,
    viewerApiRef,
  ]);

  return { activeAllographLabel, filteredA9s };
}
