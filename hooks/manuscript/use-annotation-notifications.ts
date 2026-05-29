'use client';

import * as React from 'react';

import { showActionNotification } from '@/components/ui/action-toast';
import { isDbId } from '@/lib/annotation-popup-utils';
import { annotationCountLabel } from '@/lib/manuscript-viewer-collection';
import type { Annotation as A9sAnnotation } from '@/components/manuscript/manuscript-annotorious';
import type { A9sWithMeta } from '@/types/annotation-viewer';

interface UseAnnotationNotificationsArgs {
  canPersistAnyAnnotations: boolean;
  getCanonicalAnnotation: (annotation: A9sAnnotation) => A9sWithMeta;
}

/**
 * Toast helpers for local annotation create/update/delete, extracted from
 * manuscript-viewer.tsx (Track D1). Pure presentation — no viewer state.
 */
export function useAnnotationNotifications({
  canPersistAnyAnnotations,
  getCanonicalAnnotation,
}: UseAnnotationNotificationsArgs) {
  const notifyLocalAnnotationUpdate = React.useCallback(
    (count: number) => {
      const isBulk = count > 1;

      showActionNotification({
        kind: isBulk ? 'bulk-updated' : 'updated',
        title: isBulk ? `${annotationCountLabel(count)} updated` : 'Annotation updated',
        description: canPersistAnyAnnotations
          ? 'Pending save.'
          : `${isBulk ? 'Selected annotations were' : 'The annotation was'} updated in the viewer.`,
      });
    },
    [canPersistAnyAnnotations]
  );

  const notifyLocalAnnotationCreate = React.useCallback(
    (count: number) => {
      const isBulk = count > 1;

      showActionNotification({
        kind: isBulk ? 'bulk-created' : 'created',
        title: isBulk ? `${annotationCountLabel(count)} created` : 'Annotation created',
        description: canPersistAnyAnnotations
          ? 'Pending save.'
          : `${isBulk ? 'Annotations were' : 'Annotation was'} created in the viewer.`,
      });
    },
    [canPersistAnyAnnotations]
  );

  const notifyDeletedAnnotations = React.useCallback(
    (annotations: A9sAnnotation[]) => {
      if (annotations.length === 0) return;

      const canonical = annotations.map((annotation) => getCanonicalAnnotation(annotation));
      const draftCount = canonical.filter((annotation) => !isDbId(annotation.id)).length;
      const savedCount = canonical.length - draftCount;
      const isBulk = canonical.length > 1;

      const description =
        savedCount > 0 && canPersistAnyAnnotations
          ? 'Pending save.'
          : `${annotationCountLabel(canonical.length)} removed from the viewer.`;

      showActionNotification({
        kind: isBulk ? 'bulk-deleted' : 'deleted',
        title: isBulk
          ? `${annotationCountLabel(canonical.length)} deleted`
          : draftCount === 1
            ? 'Draft annotation deleted'
            : 'Annotation marked for deletion',
        description,
      });
    },
    [canPersistAnyAnnotations, getCanonicalAnnotation]
  );

  return { notifyLocalAnnotationUpdate, notifyLocalAnnotationCreate, notifyDeletedAnnotations };
}
