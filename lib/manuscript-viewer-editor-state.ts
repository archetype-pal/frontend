import type { Annotation as A9sAnnotation } from '@/components/manuscript/manuscript-annotorious';
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

export interface SaveResultPartition {
  succeededUpsertRecordIds: Set<string>;
  failedUpsertRecordIds: Set<string>;
  succeededDeleteRecordIds: Set<string>;
  failedDeleteRecordIds: Set<string>;
  succeededCreatedCount: number;
  succeededUpdatedCount: number;
  succeededDeletedCount: number;
  firstError: string | null;
}

// Pair settled save promises with their source records and tally outcomes.
// Lets the caller distinguish "5 of 6 succeeded" from "all failed" so
// partial successes keep their server-side commits and failures stay
// dirty for retry.
export function partitionSaveResults(
  upsertRecords: AnnotationEditorRecord[],
  upsertResults: PromiseSettledResult<unknown>[],
  deleteRecords: AnnotationEditorRecord[],
  deleteResults: PromiseSettledResult<unknown>[]
): SaveResultPartition {
  const partition: SaveResultPartition = {
    succeededUpsertRecordIds: new Set(),
    failedUpsertRecordIds: new Set(),
    succeededDeleteRecordIds: new Set(),
    failedDeleteRecordIds: new Set(),
    succeededCreatedCount: 0,
    succeededUpdatedCount: 0,
    succeededDeletedCount: 0,
    firstError: null,
  };

  const captureError = (reason: unknown) => {
    if (partition.firstError) return;
    partition.firstError = reason instanceof Error ? reason.message : String(reason);
  };

  upsertRecords.forEach((record, index) => {
    const result = upsertResults[index];
    if (!result) return;
    if (result.status === 'fulfilled') {
      partition.succeededUpsertRecordIds.add(record.id);
      if (record.dirtyState === 'created') partition.succeededCreatedCount += 1;
      else if (record.dirtyState === 'updated') partition.succeededUpdatedCount += 1;
    } else {
      partition.failedUpsertRecordIds.add(record.id);
      captureError(result.reason);
    }
  });

  deleteRecords.forEach((record, index) => {
    const result = deleteResults[index];
    if (!result) return;
    if (result.status === 'fulfilled') {
      partition.succeededDeleteRecordIds.add(record.id);
      partition.succeededDeletedCount += 1;
    } else {
      partition.failedDeleteRecordIds.add(record.id);
      captureError(result.reason);
    }
  });

  return partition;
}

// After a partial save, overlay failed records on top of the server
// refresh so they stay locally dirty and visible for retry. Server state
// for successful records is authoritative; failed records keep their
// pre-save annotation (the user's in-flight edits).
export function mergeFailedRecordsIntoRefresh(
  refreshedMap: AnnotationEditorRecordMap,
  failedRecords: AnnotationEditorRecord[]
): AnnotationEditorRecordMap {
  if (failedRecords.length === 0) return refreshedMap;
  const next = { ...refreshedMap };
  for (const record of failedRecords) {
    next[record.id] = record;
  }
  return next;
}
