'use client';

import * as React from 'react';

import type { ViewerApi } from '@/components/manuscript/manuscript-annotorious';

interface UseViewerOsdSyncArgs {
  osdReady: boolean;
  viewerApiRef: React.RefObject<ViewerApi | null>;
  hoveredAnnotationId: string | null;
  highlightAllographId: number | null;
  highlightedIds: string[];
}

/**
 * Pushes the derived highlight state into the OSD viewer, extracted from
 * manuscript-viewer.tsx (Track D1). The derived values (highlightAllographId,
 * highlightedIds) are computed in the component and passed in.
 */
export function useViewerOsdSync({
  osdReady,
  viewerApiRef,
  hoveredAnnotationId,
  highlightAllographId,
  highlightedIds,
}: UseViewerOsdSyncArgs) {
  React.useEffect(() => {
    if (!osdReady) return;

    if (hoveredAnnotationId) {
      viewerApiRef.current?.highlightAnnotations?.([hoveredAnnotationId]);
      return;
    }

    if (highlightAllographId == null) {
      viewerApiRef.current?.clearHighlights?.();
      return;
    }

    viewerApiRef.current?.highlightAnnotations?.(highlightedIds);
  }, [osdReady, hoveredAnnotationId, highlightAllographId, highlightedIds, viewerApiRef]);
}
