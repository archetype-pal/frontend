'use client';

import * as React from 'react';

import type { ViewerApi } from '@/components/manuscript/manuscript-annotorious';

interface UseAnnotationVisibilityToggleArgs {
  imageId: string;
  osdReady: boolean;
  viewerApiRef: React.RefObject<ViewerApi | null>;
}

/**
 * Owns the per-image "annotations visible" toggle, extracted from
 * manuscript-viewer.tsx (Track D1): hydrates from localStorage (keyed by
 * imageId), syncs into the OSD viewer, and persists on toggle.
 */
export function useAnnotationVisibilityToggle({
  imageId,
  osdReady,
  viewerApiRef,
}: UseAnnotationVisibilityToggleArgs) {
  const [annotationsEnabled, setAnnotationsEnabled] = React.useState<boolean>(true);

  // Hydrate from localStorage (re-runs per image).
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = localStorage.getItem(`annotationsVisible:${imageId}`);
    if (saved !== null) {
      setAnnotationsEnabled(saved === 'true');
    }
  }, [imageId]);

  // Sync visibility into the viewer once it's ready.
  React.useEffect(() => {
    if (!osdReady) return;
    viewerApiRef.current?.toggleAnnotations(annotationsEnabled);
  }, [annotationsEnabled, osdReady, viewerApiRef]);

  const toggleAnnotations = React.useCallback(() => {
    setAnnotationsEnabled((prev) => {
      const next = !prev;

      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(`annotationsVisible:${imageId}`, String(next));
        } catch {
          // ignore
        }
      }

      // OSD sync is handled by the effect above (annotationsEnabled is a dep);
      // calling it here too would double-fire under StrictMode.
      return next;
    });
  }, [imageId]);

  return { annotationsEnabled, toggleAnnotations };
}
