import type { Annotation as A9sAnnotation } from '@/components/manuscript/ManuscriptAnnotorious';
import type {
  A9sWithMeta,
  AnnotationEditorDirtyState,
  AnnotationEditorRecord,
  AnnotationEditorRecordMap,
} from '@/types/annotation-viewer';

import { isDbId } from '@/lib/annotation-popup-utils';

function toA9sWithMeta(annotation: A9sAnnotation): A9sWithMeta {
  return annotation as A9sWithMeta;
}

function getHydratedDirtyState(annotation: A9sAnnotation): AnnotationEditorDirtyState {
  return isDbId(annotation.id) ? 'clean' : 'created';
}

export function createEditorRecord(
  annotation: A9sAnnotation,
  dirtyState: AnnotationEditorDirtyState = getHydratedDirtyState(annotation)
): AnnotationEditorRecord {
  return {
    id: annotation.id,
    annotation: toA9sWithMeta(annotation),
    source: isDbId(annotation.id) ? 'persisted' : 'draft',
    dirtyState,
    isDeleted: dirtyState === 'deleted',
    lastTouchedAt: Date.now(),
  };
}

export function buildHydratedEditorRecordMap(
  annotations: A9sAnnotation[]
): AnnotationEditorRecordMap {
  return annotations.reduce<AnnotationEditorRecordMap>((acc, annotation) => {
    acc[annotation.id] = createEditorRecord(annotation);
    return acc;
  }, {});
}

export function countDirtyEditorRecords(records: AnnotationEditorRecordMap): number {
  return Object.values(records).filter((record) => record.dirtyState !== 'clean').length;
}

export function markAnnotationCreated(
  records: AnnotationEditorRecordMap,
  annotation: A9sAnnotation
): AnnotationEditorRecordMap {
  return {
    ...records,
    [annotation.id]: createEditorRecord(annotation, 'created'),
  };
}

export function markAnnotationUpdated(
  records: AnnotationEditorRecordMap,
  annotation: A9sAnnotation
): AnnotationEditorRecordMap {
  const existing = records[annotation.id];

  if (!existing) {
    return markAnnotationCreated(records, annotation);
  }

  const nextDirtyState: AnnotationEditorDirtyState =
    existing.dirtyState === 'created' || existing.source === 'draft' ? 'created' : 'updated';

  return {
    ...records,
    [annotation.id]: {
      ...existing,
      annotation: toA9sWithMeta(annotation),
      dirtyState: nextDirtyState,
      isDeleted: false,
      lastTouchedAt: Date.now(),
    },
  };
}

export function markAnnotationDeleted(
  records: AnnotationEditorRecordMap,
  annotationId: string
): AnnotationEditorRecordMap {
  const existing = records[annotationId];
  if (!existing) return records;

  // Draft-only annotations can simply disappear locally.
  if (existing.source === 'draft') {
    const next = { ...records };
    delete next[annotationId];
    return next;
  }

  // Persisted annotations stay in state as locally deleted until
  // backend delete persistence is implemented in a later step.
  return {
    ...records,
    [annotationId]: {
      ...existing,
      dirtyState: 'deleted',
      isDeleted: true,
      lastTouchedAt: Date.now(),
    },
  };
}
