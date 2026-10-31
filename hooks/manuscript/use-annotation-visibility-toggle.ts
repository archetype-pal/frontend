'use client';

import * as React from 'react';

import type { ViewerApi } from '@/components/manuscript/manuscript-annotorious';
import { parseBoolean, useStoredPreference } from '@/hooks/use-stored-preference';

interface UseAnnotationVisibilityToggleArgs {
  imageId: string;
  osdReady: boolean;
  viewerApiRef: React.RefObject<ViewerApi | null>;
}

const parseVisible = (raw: string | null) => parseBoolean(raw, true);

/**
 * Owns the per-image "annotations visible" toggle: remembered per imageId in
 * localStorage and synced into the OSD viewer.
 */
export function useAnnotationVisibilityToggle({
  imageId,
  osdReady,
  viewerApiRef,
}: UseAnnotationVisibilityToggleArgs) {
  const [annotationsEnabled, setAnnotationsEnabled] = useStoredPreference(
    `annotationsVisible:${imageId}`,
    parseVisible,
    String,
    true
  );

  // Sync visibility into the viewer once it's ready.
  React.useEffect(() => {
    if (!osdReady) return;
    viewerApiRef.current?.toggleAnnotations(annotationsEnabled);
  }, [annotationsEnabled, osdReady, viewerApiRef]);

  // OSD sync is handled by the effect above (annotationsEnabled is a dep);
  // calling it here too would double-fire under StrictMode.
  const toggleAnnotations = React.useCallback(
    () => setAnnotationsEnabled(!annotationsEnabled),
    [annotationsEnabled, setAnnotationsEnabled]
  );

  return { annotationsEnabled, toggleAnnotations };
}
