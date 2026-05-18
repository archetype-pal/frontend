import { describe, expect, it } from 'vitest';

import {
  buildHydratedEditorRecordMap,
  countDirtyEditorRecords,
  createEditorRecord,
  markAnnotationCreated,
  markAnnotationDeleted,
  markAnnotationUpdated,
  mergeFailedRecordsIntoRefresh,
  partitionSaveResults,
  type SaveResultPartition,
} from './manuscript-viewer-editor-state';
import type { Annotation as A9sAnnotation } from '@/components/manuscript/manuscript-annotorious';
import type { AnnotationEditorRecord } from '@/types/annotation-viewer';

function makeAnnotation(id: string): A9sAnnotation {
  return {
    id,
    type: 'Annotation',
    body: [],
    target: { selector: { type: 'SvgSelector', value: '<svg></svg>' } },
  } as unknown as A9sAnnotation;
}

function makeRecord(
  id: string,
  dirtyState: AnnotationEditorRecord['dirtyState'],
  source: AnnotationEditorRecord['source']
): AnnotationEditorRecord {
  return {
    id,
    annotation: makeAnnotation(id) as AnnotationEditorRecord['annotation'],
    source,
    dirtyState,
    isDeleted: dirtyState === 'deleted',
    lastTouchedAt: 1,
  };
}

describe('createEditorRecord', () => {
  it('treats db-prefixed ids as persisted/clean by default', () => {
    const record = createEditorRecord(makeAnnotation('db:42'));
    expect(record.source).toBe('persisted');
    expect(record.dirtyState).toBe('clean');
  });

  it('treats non-db ids as draft/created by default', () => {
    const record = createEditorRecord(makeAnnotation('local-uuid'));
    expect(record.source).toBe('draft');
    expect(record.dirtyState).toBe('created');
  });

  it('respects an explicit dirtyState override', () => {
    const record = createEditorRecord(makeAnnotation('db:42'), 'updated');
    expect(record.dirtyState).toBe('updated');
    expect(record.isDeleted).toBe(false);
  });
});

describe('buildHydratedEditorRecordMap', () => {
  it('keys records by annotation id', () => {
    const map = buildHydratedEditorRecordMap([makeAnnotation('db:1'), makeAnnotation('db:2')]);
    expect(Object.keys(map).sort()).toEqual(['db:1', 'db:2']);
  });

  it('returns an empty map for an empty input', () => {
    expect(buildHydratedEditorRecordMap([])).toEqual({});
  });
});

describe('countDirtyEditorRecords', () => {
  it('counts everything except clean records', () => {
    const map = {
      a: makeRecord('a', 'clean', 'persisted'),
      b: makeRecord('b', 'created', 'draft'),
      c: makeRecord('c', 'updated', 'persisted'),
      d: makeRecord('d', 'deleted', 'persisted'),
    };
    expect(countDirtyEditorRecords(map)).toBe(3);
  });
});

describe('markAnnotationUpdated', () => {
  it('promotes a missing record to a fresh created entry', () => {
    const next = markAnnotationUpdated({}, makeAnnotation('local-uuid'));
    expect(next['local-uuid'].dirtyState).toBe('created');
    expect(next['local-uuid'].source).toBe('draft');
  });

  it('keeps a draft record marked created (not updated) after re-edit', () => {
    const base = { x: makeRecord('x', 'created', 'draft') };
    const next = markAnnotationUpdated(base, makeAnnotation('x'));
    expect(next.x.dirtyState).toBe('created');
  });

  it('flips a persisted clean record to updated on edit', () => {
    const base = { 'db:1': makeRecord('db:1', 'clean', 'persisted') };
    const next = markAnnotationUpdated(base, makeAnnotation('db:1'));
    expect(next['db:1'].dirtyState).toBe('updated');
  });
});

describe('markAnnotationDeleted', () => {
  it('removes draft records outright', () => {
    const base = { x: makeRecord('x', 'created', 'draft') };
    const next = markAnnotationDeleted(base, 'x');
    expect(next).toEqual({});
  });

  it('marks persisted records as locally deleted', () => {
    const base = { 'db:1': makeRecord('db:1', 'clean', 'persisted') };
    const next = markAnnotationDeleted(base, 'db:1');
    expect(next['db:1'].dirtyState).toBe('deleted');
    expect(next['db:1'].isDeleted).toBe(true);
  });

  it('is a no-op for an unknown id', () => {
    const base = { a: makeRecord('a', 'clean', 'persisted') };
    expect(markAnnotationDeleted(base, 'missing')).toBe(base);
  });
});

describe('markAnnotationCreated → markAnnotationUpdated → markAnnotationDeleted sequence', () => {
  it('a draft created → updated → deleted leaves the map empty', () => {
    let map = markAnnotationCreated({}, makeAnnotation('local-1'));
    expect(map['local-1'].dirtyState).toBe('created');

    map = markAnnotationUpdated(map, makeAnnotation('local-1'));
    expect(map['local-1'].dirtyState).toBe('created');

    map = markAnnotationDeleted(map, 'local-1');
    expect(map).toEqual({});
  });
});

describe('partitionSaveResults', () => {
  const upsertRecords = [
    makeRecord('local-1', 'created', 'draft'),
    makeRecord('local-2', 'created', 'draft'),
    makeRecord('db:5', 'updated', 'persisted'),
  ];
  const deleteRecords = [makeRecord('db:9', 'deleted', 'persisted')];

  it('all succeed → no failed sets, counts match per dirty state', () => {
    const partition = partitionSaveResults(
      upsertRecords,
      [
        { status: 'fulfilled', value: undefined },
        { status: 'fulfilled', value: undefined },
        { status: 'fulfilled', value: undefined },
      ],
      deleteRecords,
      [{ status: 'fulfilled', value: undefined }]
    );

    expect(partition.failedUpsertRecordIds.size).toBe(0);
    expect(partition.failedDeleteRecordIds.size).toBe(0);
    expect(partition.succeededUpsertRecordIds.size).toBe(3);
    expect(partition.succeededDeleteRecordIds.size).toBe(1);
    expect(partition.succeededCreatedCount).toBe(2);
    expect(partition.succeededUpdatedCount).toBe(1);
    expect(partition.succeededDeletedCount).toBe(1);
    expect(partition.firstError).toBeNull();
  });

  it('partial failure → succeeded records stay in succeeded sets', () => {
    // local-1 succeeds, local-2 fails, db:5 succeeds, db:9 fails
    const partition = partitionSaveResults(
      upsertRecords,
      [
        { status: 'fulfilled', value: undefined },
        { status: 'rejected', reason: new Error('boom upsert') },
        { status: 'fulfilled', value: undefined },
      ],
      deleteRecords,
      [{ status: 'rejected', reason: new Error('boom delete') }]
    );

    expect(partition.succeededUpsertRecordIds.has('local-1')).toBe(true);
    expect(partition.failedUpsertRecordIds.has('local-2')).toBe(true);
    expect(partition.succeededUpsertRecordIds.has('db:5')).toBe(true);
    expect(partition.failedDeleteRecordIds.has('db:9')).toBe(true);
    // The first error encountered is captured; later errors don't overwrite it.
    expect(partition.firstError).toBe('boom upsert');
    // Counts only include successes.
    expect(partition.succeededCreatedCount).toBe(1);
    expect(partition.succeededUpdatedCount).toBe(1);
    expect(partition.succeededDeletedCount).toBe(0);
  });

  it('all fail → no successes, firstError is set', () => {
    const partition = partitionSaveResults(
      upsertRecords,
      [
        { status: 'rejected', reason: new Error('a') },
        { status: 'rejected', reason: new Error('b') },
        { status: 'rejected', reason: new Error('c') },
      ],
      deleteRecords,
      [{ status: 'rejected', reason: new Error('d') }]
    );

    expect(partition.succeededUpsertRecordIds.size).toBe(0);
    expect(partition.succeededDeleteRecordIds.size).toBe(0);
    expect(partition.failedUpsertRecordIds.size).toBe(3);
    expect(partition.failedDeleteRecordIds.size).toBe(1);
    expect(partition.firstError).toBe('a');
  });

  it('coerces non-Error rejection reasons to strings', () => {
    const partition = partitionSaveResults(
      [makeRecord('x', 'created', 'draft')],
      [{ status: 'rejected', reason: 'string-reason' }],
      [],
      []
    );
    expect(partition.firstError).toBe('string-reason');
  });

  it('empty inputs return an empty partition', () => {
    const partition = partitionSaveResults([], [], [], []);
    const empty: SaveResultPartition = {
      succeededUpsertRecordIds: new Set(),
      failedUpsertRecordIds: new Set(),
      succeededDeleteRecordIds: new Set(),
      failedDeleteRecordIds: new Set(),
      succeededCreatedCount: 0,
      succeededUpdatedCount: 0,
      succeededDeletedCount: 0,
      firstError: null,
    };
    expect(partition).toEqual(empty);
  });
});

describe('mergeFailedRecordsIntoRefresh', () => {
  it('returns the refreshed map unchanged when no failures', () => {
    const refreshed = { a: makeRecord('a', 'clean', 'persisted') };
    expect(mergeFailedRecordsIntoRefresh(refreshed, [])).toBe(refreshed);
  });

  it('overlays a failed update on top of the refreshed entry', () => {
    // Server refresh brought back db:1 with no local edits; user's local
    // record is still marked updated with their in-flight changes.
    const refreshed = { 'db:1': makeRecord('db:1', 'clean', 'persisted') };
    const localFailedUpdate = makeRecord('db:1', 'updated', 'persisted');
    const merged = mergeFailedRecordsIntoRefresh(refreshed, [localFailedUpdate]);
    expect(merged['db:1'].dirtyState).toBe('updated');
  });

  it('preserves a failed create that the server does not know about', () => {
    const refreshed = { 'db:1': makeRecord('db:1', 'clean', 'persisted') };
    const localFailedCreate = makeRecord('local-uuid', 'created', 'draft');
    const merged = mergeFailedRecordsIntoRefresh(refreshed, [localFailedCreate]);
    expect(merged['local-uuid'].dirtyState).toBe('created');
    expect(merged['db:1'].dirtyState).toBe('clean');
  });

  it('preserves a failed delete (record stays locally marked deleted)', () => {
    const refreshed = { 'db:9': makeRecord('db:9', 'clean', 'persisted') };
    const localFailedDelete = makeRecord('db:9', 'deleted', 'persisted');
    const merged = mergeFailedRecordsIntoRefresh(refreshed, [localFailedDelete]);
    expect(merged['db:9'].dirtyState).toBe('deleted');
    expect(merged['db:9'].isDeleted).toBe(true);
  });

  it('does not mutate the input map', () => {
    const refreshed = { a: makeRecord('a', 'clean', 'persisted') };
    const before = { ...refreshed };
    mergeFailedRecordsIntoRefresh(refreshed, [makeRecord('b', 'created', 'draft')]);
    expect(refreshed).toEqual(before);
  });
});
