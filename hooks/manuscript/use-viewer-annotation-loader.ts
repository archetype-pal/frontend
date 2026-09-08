'use client';

import * as React from 'react';

import { buildInitialViewerAnnotations } from '@/lib/manuscript-viewer-annotations';
import type {
  Annotation as A9sAnnotation,
  ViewerApi,
} from '@/components/manuscript/manuscript-annotorious';

interface UseViewerAnnotationLoaderArgs {
  imageId: string;
  manuscriptImage: { id: number | string; iiif_image: string } | null | undefined;
  imageHeight: number | null | undefined;
  allographNameById: Map<number, string>;
  isPublicDemoMode: boolean;
  canViewEditorialControls: boolean;
  token?: string | null;
  resetEditorFrom: (annotations: A9sAnnotation[]) => void;
  viewerApiRef: React.RefObject<ViewerApi | null>;
}

/**
 * Owns the image's saved annotations: the initial load, and the reload behind
 * "reset view". Both go through one `buildInitialViewerAnnotations` call so the
 * parameter set cannot drift between them — they differ only in `currentUrl`,
 * deliberately: the initial load honours a deep link, a reset must not re-apply
 * one.
 */
export function useViewerAnnotationLoader({
  imageId,
  manuscriptImage,
  imageHeight,
  allographNameById,
  isPublicDemoMode,
  canViewEditorialControls,
  token,
  resetEditorFrom,
  viewerApiRef,
}: UseViewerAnnotationLoaderArgs) {
  const [initialA9sAnnots, setInitialA9sAnnots] = React.useState<A9sAnnotation[]>([]);
  // The image whose annotations are loaded, else null. initialA9sAnnots can't say
  // this: it is `[]` both before the first load and for a genuinely empty image.
  const [annotationsLoadedFor, setAnnotationsLoadedFor] = React.useState<string | null>(null);

  const build = React.useCallback(
    (extra: { currentViewerAnnotations: A9sAnnotation[]; currentUrl?: string }) => {
      if (!manuscriptImage || !imageHeight) return null;
      return buildInitialViewerAnnotations({
        itemImageId: String(manuscriptImage.id),
        iiifImage: manuscriptImage.iiif_image,
        imageHeight,
        allographNameById,
        isPublicDemoMode,
        includeEditorial: canViewEditorialControls,
        includeText: true,
        token,
        ...extra,
      });
    },
    [
      allographNameById,
      canViewEditorialControls,
      imageHeight,
      isPublicDemoMode,
      manuscriptImage,
      token,
    ]
  );

  React.useEffect(() => {
    let isMounted = true;

    const load = async () => {
      try {
        const merged = await build({
          currentViewerAnnotations: viewerApiRef.current?.getAnnotations?.() ?? [],
        });
        if (merged === null || !isMounted) return;

        setInitialA9sAnnots(merged);
        resetEditorFrom(merged);
        setAnnotationsLoadedFor(imageId);
      } catch {
        if (isMounted) {
          setInitialA9sAnnots([]);
          resetEditorFrom([]);
          setAnnotationsLoadedFor(null); // don't-know, not nothing-is-live
        }
      }
    };

    void load();

    return () => {
      isMounted = false;
    };
  }, [
    build,
    imageId, // stamped into annotationsLoadedFor; a stale id would gate the wrong image
    resetEditorFrom,
    viewerApiRef,
  ]);

  /** Reload from the server, discarding local state. Throws if the fetch fails. */
  const reloadAnnotations = React.useCallback(async () => {
    // `currentUrl: ''` suppresses the deep-link handling the initial load wants:
    // resetting the view must not re-apply the annotation a share URL points at.
    const refreshed = await build({ currentViewerAnnotations: [], currentUrl: '' });
    if (refreshed === null) return;

    setInitialA9sAnnots(refreshed);
    resetEditorFrom(refreshed);
  }, [build, resetEditorFrom]);

  return { initialA9sAnnots, setInitialA9sAnnots, annotationsLoadedFor, reloadAnnotations };
}
