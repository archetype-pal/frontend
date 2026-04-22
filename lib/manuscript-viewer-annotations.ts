import { fetchAnnotationsForImage } from '@/services/annotations';
import { backendToA9sAnnotation } from '@/lib/anno-mapping';

import type { Annotation as A9sAnnotation } from '@/components/manuscript/manuscript-annotorious';

import { decodeDraftSharePayload, isDbId } from '@/lib/annotation-popup-utils';

export async function buildInitialViewerAnnotations(params: {
  itemImageId: string;
  iiifImage: string;
  imageHeight: number;
  allographNameById: Map<number, string>;
  isPublicDemoMode: boolean;
  currentViewerAnnotations: A9sAnnotation[];
  currentUrl?: string;
}): Promise<A9sAnnotation[]> {
  const { itemImageId, imageHeight, allographNameById, currentViewerAnnotations, currentUrl } =
    params;

  const list = await fetchAnnotationsForImage(itemImageId);

  const dbMapped: A9sAnnotation[] = list.map((annotation) =>
    backendToA9sAnnotation(annotation, imageHeight, allographNameById.get(annotation.allograph))
  );

  const currentViewerDrafts = currentViewerAnnotations.filter(
    (annotation): annotation is A9sAnnotation => !isDbId(annotation?.id)
  );

  const mergedIds = new Set(dbMapped.map((annotation) => annotation.id));
  let merged: A9sAnnotation[] = [
    ...dbMapped,
    ...currentViewerDrafts.filter((annotation) => !mergedIds.has(annotation.id)),
  ];

  const resolvedUrl =
    currentUrl ?? (typeof window !== 'undefined' ? window.location.href : undefined);

  if (resolvedUrl) {
    try {
      const url = new URL(resolvedUrl);
      const draftParam = url.searchParams.get('draft');

      if (draftParam) {
        const decoded = decodeDraftSharePayload(draftParam);

        if (decoded?.target) {
          const sharedDraft: A9sAnnotation = {
            id: decoded.id || 'draft:shared',
            type: 'Annotation',
            target: decoded.target,
            body: decoded.body ?? [],
            _meta: decoded._meta,
          };

          if (!merged.some((annotation) => annotation.id === sharedDraft.id)) {
            merged = [...merged, sharedDraft];
          }
        }
      }
    } catch {
      // ignore invalid URL
    }
  }

  return merged;
}
