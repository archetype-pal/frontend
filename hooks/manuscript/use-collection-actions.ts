'use client';

import * as React from 'react';

import { useCollection, type CollectionItem } from '@/contexts/collection-context';
import { showActionNotification } from '@/components/ui/action-toast';
import {
  annotationCountLabel,
  buildAnnotationCollectionItem,
  buildImageCollectionItem,
  type ViewerCollectionContext,
} from '@/lib/manuscript-viewer-collection';
import { MAX_COLLECTION_NAME_LENGTH, normalizeCollectionName } from '@/lib/collection-storage';
import type { Annotation as A9sAnnotation } from '@/components/manuscript/manuscript-annotorious';
import type { ManuscriptImage as ManuscriptImageType } from '@/types/manuscript-image';
import type { Manuscript } from '@/types/manuscript';
import type { AnnotationEditorRecordMap } from '@/types/annotation-viewer';

interface UseCollectionActionsArgs {
  manuscript: Manuscript | null;
  manuscriptImage: ManuscriptImageType | null;
  imageHeight: number;
  editorRecords: AnnotationEditorRecordMap;
}

function getAvailableCollectionName(
  collections: Array<{ name: string }>,
  requestedName: string
): string {
  const baseName = normalizeCollectionName(requestedName);
  const existingNames = new Set(
    collections.map((collection) => collection.name.toLocaleLowerCase())
  );
  if (!existingNames.has(baseName.toLocaleLowerCase())) return baseName;

  let suffixNumber = 2;
  while (true) {
    const suffix = ` (${suffixNumber})`;
    const candidate = `${baseName.slice(0, MAX_COLLECTION_NAME_LENGTH - suffix.length).trimEnd()}${suffix}`;
    if (!existingNames.has(candidate.toLocaleLowerCase())) return candidate;
    suffixNumber += 1;
  }
}

/**
 * Lightbox/collection integration for the manuscript viewer, extracted from
 * manuscript-viewer.tsx (Track D1). Owns the collection context derivation and
 * the page/annotation add/remove/toggle handlers. Calls useCollection()
 * internally and re-exports isInCollection for the popup layer prop.
 */
export function useCollectionActions({
  manuscript,
  manuscriptImage,
  imageHeight,
  editorRecords,
}: UseCollectionActionsArgs) {
  const {
    addItem,
    removeItem,
    isInCollection,
    collections,
    canManageCollections,
    createCollection,
  } = useCollection();

  const collectionContext = React.useMemo<ViewerCollectionContext | null>(() => {
    if (!manuscriptImage) return null;

    return {
      itemPartId: manuscriptImage.item_part,
      itemImageId: manuscriptImage.id,
      iiifImage: manuscriptImage.iiif_image,
      locus: manuscriptImage.locus ?? '',
      shelfmark: manuscript?.current_item?.shelfmark || manuscript?.display_label || '',
      repositoryName: manuscript?.current_item?.repository?.name || '',
      repositoryCity: manuscript?.current_item?.repository?.place || '',
      date: manuscript?.historical_item?.date_display || '',
    };
  }, [manuscript, manuscriptImage]);

  const pageCollectionItem = React.useMemo(
    () => (collectionContext ? buildImageCollectionItem(collectionContext) : null),
    [collectionContext]
  );

  const isPageInCollection = pageCollectionItem
    ? isInCollection(pageCollectionItem.id, 'image')
    : false;

  const pageAnnotationCollectionItems = React.useMemo(() => {
    if (!collectionContext || !imageHeight) return [];

    return Object.values(editorRecords)
      .filter((record) => record.source === 'persisted' && !record.isDeleted)
      .map((record) =>
        buildAnnotationCollectionItem(record.annotation, imageHeight, collectionContext)
      )
      .filter((item): item is CollectionItem => item !== null);
  }, [collectionContext, editorRecords, imageHeight]);
  const canCreateAnnotationCollection =
    canManageCollections && pageAnnotationCollectionItems.length > 0;

  // Closes over collectionContext + imageHeight so AnnotationPopupLayer
  // doesn't need to know either type. Returns null when collection items
  // can't be constructed (no context, no image height, or the annotation
  // has no db id).
  const getCollectionItemFor = React.useCallback(
    (annotation: A9sAnnotation): CollectionItem | null => {
      if (!collectionContext || !imageHeight) return null;
      return buildAnnotationCollectionItem(annotation, imageHeight, collectionContext);
    },
    [collectionContext, imageHeight]
  );

  const handleTogglePageCollection = React.useCallback(() => {
    if (!pageCollectionItem) return;

    if (isInCollection(pageCollectionItem.id, 'image')) {
      removeItem(pageCollectionItem.id, 'image');
      return;
    }

    addItem(pageCollectionItem);
  }, [addItem, isInCollection, pageCollectionItem, removeItem]);

  const handleCreateAnnotationCollection = React.useCallback(() => {
    if (!canManageCollections || !collectionContext || pageAnnotationCollectionItems.length === 0) {
      return;
    }

    const pageLabel =
      [collectionContext.shelfmark, collectionContext.locus].filter(Boolean).join(' ') ||
      `Page ${collectionContext.itemImageId}`;
    const collectionName = getAvailableCollectionName(collections, `${pageLabel} annotations`);
    if (!createCollection(collectionName, pageAnnotationCollectionItems)) return;

    showActionNotification({
      kind: 'saved',
      title: 'Collection created',
      description: `Created ${collectionName} with ${annotationCountLabel(
        pageAnnotationCollectionItems.length
      )} from this page.`,
    });
  }, [
    canManageCollections,
    collectionContext,
    collections,
    createCollection,
    pageAnnotationCollectionItems,
  ]);

  const handleToggleAnnotationCollection = React.useCallback(
    (annotation: A9sAnnotation) => {
      if (!collectionContext || !imageHeight) return;

      const item = buildAnnotationCollectionItem(annotation, imageHeight, collectionContext);
      if (!item) return;

      if (isInCollection(item.id, 'graph')) {
        removeItem(item.id, 'graph');
        return;
      }

      addItem(item);
    },
    [addItem, collectionContext, imageHeight, isInCollection, removeItem]
  );

  return {
    isInCollection,
    pageCollectionItem,
    isPageInCollection,
    pageAnnotationCollectionItems,
    canCreateAnnotationCollection,
    getCollectionItemFor,
    handleTogglePageCollection,
    handleCreateAnnotationCollection,
    handleToggleAnnotationCollection,
  };
}
