/**
 * Pure helpers extracted from manuscript-viewer.tsx (Track D1 decomposition):
 * collection-item builders and annotation-count phrasing. Render-agnostic and
 * closure-free, so they live here and are unit-tested directly.
 */

import type { CollectionItem } from '@/contexts/collection-context';
import { a9sToBackendFeature, dbIdFromA9s } from '@/lib/anno-mapping';
import type { Annotation as A9sAnnotation } from '@/components/manuscript/manuscript-annotorious';
import type { A9sWithMeta } from '@/types/annotation-viewer';

export type ViewerCollectionContext = {
  itemPartId: number;
  itemImageId: number;
  iiifImage: string;
  locus: string;
  shelfmark: string;
  repositoryName: string;
  repositoryCity: string;
  date: string;
};

export function annotationCountLabel(count: number): string {
  return `${count} annotation${count === 1 ? '' : 's'}`;
}

export function countPhrase(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function joinCountPhrases(parts: string[]): string {
  if (parts.length <= 1) return parts[0] ?? '';
  if (parts.length === 2) return `${parts[0]} and ${parts[1]}`;

  return `${parts.slice(0, -1).join(', ')}, and ${parts[parts.length - 1]}`;
}

export function buildImageCollectionItem(ctx: ViewerCollectionContext): CollectionItem {
  return {
    id: ctx.itemImageId,
    type: 'image',
    item_part: ctx.itemPartId,
    item_image: ctx.itemImageId,
    image_iiif: ctx.iiifImage,
    shelfmark: ctx.shelfmark,
    locus: ctx.locus,
    repository_name: ctx.repositoryName,
    repository_city: ctx.repositoryCity,
    date: ctx.date,
  };
}

export function buildAnnotationCollectionItem(
  annotation: A9sAnnotation,
  imageHeight: number,
  ctx: ViewerCollectionContext
): CollectionItem | null {
  const graphId = dbIdFromA9s(annotation);
  if (graphId == null) return null;

  try {
    const annotationType =
      (annotation as A9sWithMeta)._meta?.annotationType === 'editorial' ? 'editorial' : 'image';

    return {
      id: graphId,
      type: 'graph',
      item_part: ctx.itemPartId,
      item_image: ctx.itemImageId,
      image_iiif: ctx.iiifImage,
      annotation_type: annotationType,
      coordinates: JSON.stringify(a9sToBackendFeature(annotation, imageHeight)),
      shelfmark: ctx.shelfmark,
      locus: ctx.locus,
      repository_name: ctx.repositoryName,
      repository_city: ctx.repositoryCity,
      date: ctx.date,
    };
  } catch {
    return null;
  }
}

export function formatSavedAnnotationDescription({
  createdCount,
  updatedCount,
  deletedCount,
}: {
  createdCount: number;
  updatedCount: number;
  deletedCount: number;
}): string {
  const parts = [
    createdCount > 0 ? countPhrase(createdCount, 'created annotation', 'created annotations') : '',
    updatedCount > 0 ? countPhrase(updatedCount, 'updated annotation', 'updated annotations') : '',
    deletedCount > 0 ? countPhrase(deletedCount, 'deleted annotation', 'deleted annotations') : '',
  ].filter(Boolean);

  return parts.length > 0 ? `Saved ${joinCountPhrases(parts)}.` : 'No annotation changes to save.';
}
