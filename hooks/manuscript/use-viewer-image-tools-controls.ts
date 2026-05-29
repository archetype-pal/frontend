'use client';

import * as React from 'react';

import {
  useViewerImageAdjustments,
  type ImageAdjustmentKey,
} from '@/hooks/use-viewer-image-adjustments';
import type { ViewerApi } from '@/components/manuscript/manuscript-annotorious';

interface UseViewerImageToolsControlsArgs {
  viewerApiRef: React.RefObject<ViewerApi | null>;
  osdReady: boolean;
}

/**
 * Rotation + brightness/contrast/saturation controls for the viewer tile,
 * extracted from manuscript-viewer.tsx (Track D1). Owns the OSD adjustment-sync
 * effect and exposes `resetImageAdjustments` so the imageId-change reset can
 * clear adjustments without also resetting rotation.
 */
export function useViewerImageToolsControls({
  viewerApiRef,
  osdReady,
}: UseViewerImageToolsControlsArgs) {
  const imageTools = useViewerImageAdjustments();
  const { adjustments: imageAdjustments, hasChanges: hasImageToolChanges } = imageTools;

  const handleRotateViewer = React.useCallback(
    (degrees: number) => {
      viewerApiRef.current?.rotateBy(degrees);
      imageTools.rotate(degrees);
    },
    [imageTools, viewerApiRef]
  );

  const handleImageAdjustmentChange = React.useCallback(
    (key: ImageAdjustmentKey, value: number) => {
      imageTools.setAdjustment(key, value);
    },
    [imageTools]
  );

  const handleResetImageTools = React.useCallback(() => {
    viewerApiRef.current?.resetRotation();
    imageTools.reset();
  }, [imageTools, viewerApiRef]);

  // Push tile adjustments to the OSD viewer once it's ready.
  React.useEffect(() => {
    if (!osdReady) return;
    viewerApiRef.current?.setImageAdjustments(imageAdjustments);
  }, [imageAdjustments, osdReady, viewerApiRef]);

  return {
    imageAdjustments,
    hasImageToolChanges,
    handleRotateViewer,
    handleImageAdjustmentChange,
    handleResetImageTools,
    resetImageAdjustments: imageTools.reset,
  };
}
