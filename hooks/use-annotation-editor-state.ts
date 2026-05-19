'use client';

import * as React from 'react';

import {
  a9sToBackendFeature,
  backendToA9sAnnotation,
  dbIdFromA9s,
  isDbAnnotation,
} from '@/lib/anno-mapping';
import { getEditorialInternalNote, getStandardAnnotationNote } from '@/lib/annotation-notes';
import {
  buildHydratedEditorRecordMap,
  countDirtyEditorRecords,
  markAnnotationCreated,
  markAnnotationDeleted,
  markAnnotationUpdated,
  mergeFailedRecordsIntoRefresh,
  partitionSaveResults,
} from '@/lib/manuscript-viewer-editor-state';
import {
  createViewerAnnotation,
  deleteViewerAnnotation,
  fetchAnnotationsForImage,
  updateViewerAnnotation,
} from '@/services/annotations';

import type { Annotation as A9sAnnotation } from '@/components/manuscript/manuscript-annotorious';
import type { ManuscriptImage } from '@/types/manuscript-image';
import type {
  A9sWithMeta,
  AnnotationCreationKind,
  AnnotationEditorRecord,
  AnnotationEditorRecordMap,
  ViewerCapabilities,
} from '@/types/annotation-viewer';

// 50 ms trailing-edge window for coalescing per-pointermove drag updates
// (Phase 0.7). Short enough that a follow-up save picks up the latest shape
// via the exhaustive-deps closure refresh.
const UPDATE_FLUSH_DELAY_MS = 50;

export type SaveOutcome =
  | { kind: 'no-token' }
  | { kind: 'no-image' }
  | { kind: 'no-capability' }
  | { kind: 'no-changes' }
  | {
      kind: 'all-succeeded';
      counts: { created: number; updated: number; deleted: number };
      seed: A9sAnnotation[];
    }
  | {
      kind: 'partial';
      succeededCount: number;
      failedCount: number;
      seed: A9sAnnotation[];
    }
  | { kind: 'all-failed'; failedCount: number; firstError: string | null }
  | { kind: 'saved-but-refresh-failed'; succeededCount: number; message: string };

export interface UseAnnotationEditorStateArgs {
  token: string | null | undefined;
  manuscriptImage: ManuscriptImage | null;
  imageHeight: number;
  allographNameById: Map<number, string>;
  viewerCapabilities: ViewerCapabilities;
  canViewEditorialControls: boolean;
  // Caller-supplied predicate so we don't have to import the
  // viewer-capabilities helper here (avoids a cyclic dep).
  canPersistAnnotationKind: (
    viewerCapabilities: ViewerCapabilities,
    kind: AnnotationCreationKind
  ) => boolean;
}

// Tiny pure helper — saveAll only ever cares whether an annotation is
// editorial (which gates the persist capability + the write payload).
// Inlined here so the hook doesn't need a caller-supplied kind function
// (which would create a cycle: callers want getCanonicalAnnotation FROM
// the hook to define kind, then pass kind INTO the hook).
function getKindFromAnnotation(annotation: A9sAnnotation): AnnotationCreationKind {
  return (annotation as A9sWithMeta)._meta?.annotationType === 'editorial' ? 'editorial' : 'public';
}

export interface AnnotationEditorState {
  editorRecords: AnnotationEditorRecordMap;
  /** Live, derived from editorRecords. Excludes records marked isDeleted. */
  a9sSnapshot: A9sAnnotation[];
  dirtyCount: number;
  isDirty: boolean;
  /** Return the latest known annotation for `annotation.id` (locally edited
   * if present in records, else the input unchanged). Use this before reading
   * `_meta` off an annotation emitted by Annotorious. */
  getCanonicalAnnotation: (annotation: A9sAnnotation) => A9sWithMeta;
  markCreated: (annotation: A9sAnnotation) => void;
  /** Update by id. `{ debounced: true }` buffers per-id and flushes on the
   * trailing edge — use it for per-pointermove drag fires from Annotorious. */
  markUpdated: (annotation: A9sAnnotation, options?: { debounced?: boolean }) => void;
  markDeleted: (annotationId: string) => void;
  /** Batched update — coalesces N updates into a single state commit.
   * Used by bulk-apply flows where a draft save propagates the popup's
   * metadata to other selected drafts in the same tick. */
  markManyUpdated: (annotations: A9sAnnotation[]) => void;
  /** After Annotorious saves a draft and may assign a new persisted id,
   * remove the previous (now-stale) id and mark the new annotation as
   * updated. No-op for the id-preserving case. */
  replaceLocalAnnotation: (oldId: string, newAnnotation: A9sAnnotation) => void;
  /** Replace the entire map from a fresh server payload (post-save refetch
   * or initial load). */
  resetFrom: (annotations: A9sAnnotation[]) => void;
  /** Save all dirty records. Returns a discriminated outcome the caller
   * uses to drive toasts, popup clears, and OSD re-seeds. */
  saveAll: () => Promise<SaveOutcome>;
}

export function useAnnotationEditorState(
  args: UseAnnotationEditorStateArgs
): AnnotationEditorState {
  const {
    token,
    manuscriptImage,
    imageHeight,
    allographNameById,
    viewerCapabilities,
    canViewEditorialControls,
    canPersistAnnotationKind,
  } = args;

  const [editorRecords, setEditorRecords] = React.useState<AnnotationEditorRecordMap>({});

  const a9sSnapshot = React.useMemo<A9sAnnotation[]>(
    () =>
      Object.values(editorRecords)
        .filter((record) => !record.isDeleted)
        .map((record) => record.annotation),
    [editorRecords]
  );

  const dirtyCount = React.useMemo(() => countDirtyEditorRecords(editorRecords), [editorRecords]);
  const isDirty = dirtyCount > 0;

  const getCanonicalAnnotation = React.useCallback(
    (annotation: A9sAnnotation): A9sWithMeta => {
      return (editorRecords[annotation.id]?.annotation ?? annotation) as A9sWithMeta;
    },
    [editorRecords]
  );

  // Phase 0.7 — coalesce per-frame Annotorious update fires into one
  // setState on the trailing edge of the debounce window.
  const pendingUpdatesRef = React.useRef<Map<string, A9sAnnotation>>(new Map());
  const flushTimerRef = React.useRef<number | null>(null);

  const flushPendingUpdates = React.useCallback(() => {
    flushTimerRef.current = null;
    const batch = pendingUpdatesRef.current;
    if (batch.size === 0) return;
    pendingUpdatesRef.current = new Map();

    setEditorRecords((prev) => {
      let next = prev;
      for (const annotation of batch.values()) {
        const existing = next[annotation.id]?.annotation;
        const merged: A9sAnnotation = existing
          ? ({
              ...existing,
              ...annotation,
              body: annotation.body !== undefined ? annotation.body : existing.body,
              _meta: {
                ...(existing as A9sWithMeta)._meta,
                ...(annotation as A9sWithMeta)._meta,
              },
            } as A9sAnnotation)
          : annotation;
        next = markAnnotationUpdated(next, merged);
      }
      return next;
    });
  }, []);

  const markCreated = React.useCallback((annotation: A9sAnnotation) => {
    setEditorRecords((prev) => markAnnotationCreated(prev, annotation));
  }, []);

  const markUpdated = React.useCallback(
    (annotation: A9sAnnotation, options?: { debounced?: boolean }) => {
      if (options?.debounced) {
        pendingUpdatesRef.current.set(annotation.id, annotation);
        if (flushTimerRef.current === null) {
          flushTimerRef.current = window.setTimeout(flushPendingUpdates, UPDATE_FLUSH_DELAY_MS);
        }
        return;
      }
      setEditorRecords((prev) => markAnnotationUpdated(prev, annotation));
    },
    [flushPendingUpdates]
  );

  const markDeleted = React.useCallback((annotationId: string) => {
    setEditorRecords((prev) => markAnnotationDeleted(prev, annotationId));
  }, []);

  const markManyUpdated = React.useCallback((annotations: A9sAnnotation[]) => {
    if (annotations.length === 0) return;
    setEditorRecords((prev) => {
      let next = prev;
      for (const annotation of annotations) {
        next = markAnnotationUpdated(next, annotation);
      }
      return next;
    });
  }, []);

  const replaceLocalAnnotation = React.useCallback(
    (oldId: string, newAnnotation: A9sAnnotation) => {
      setEditorRecords((prev) => {
        const reconciled = { ...prev };
        if (newAnnotation.id !== oldId) {
          delete reconciled[oldId];
        }
        return markAnnotationUpdated(reconciled, newAnnotation);
      });
    },
    []
  );

  const resetFrom = React.useCallback((annotations: A9sAnnotation[]) => {
    setEditorRecords(buildHydratedEditorRecordMap(annotations));
  }, []);

  // Cleanup on unmount: flush any buffered drag updates so the user's
  // shape edits aren't lost on component teardown.
  React.useEffect(() => {
    return () => {
      if (flushTimerRef.current !== null) {
        window.clearTimeout(flushTimerRef.current);
      }
      flushPendingUpdates();
    };
  }, [flushPendingUpdates]);

  const saveAll = React.useCallback(async (): Promise<SaveOutcome> => {
    if (
      !viewerCapabilities.canPersistPublicAnnotations &&
      !viewerCapabilities.canPersistEditorialAnnotations
    ) {
      return { kind: 'no-capability' };
    }
    if (!manuscriptImage) return { kind: 'no-image' };
    if (!token) return { kind: 'no-token' };

    const upsertCandidates = Object.values(editorRecords).filter((record) => {
      if (record.dirtyState !== 'created' && record.dirtyState !== 'updated') {
        return false;
      }
      return canPersistAnnotationKind(viewerCapabilities, getKindFromAnnotation(record.annotation));
    });

    const deleteCandidates = Object.values(editorRecords).filter(
      (record) => record.dirtyState === 'deleted' && record.source === 'persisted'
    );

    if (upsertCandidates.length === 0 && deleteCandidates.length === 0) {
      return { kind: 'no-changes' };
    }

    // Build per-task promises. We drop records that can't produce a task
    // (e.g. persisted-but-missing-id, shouldn't happen) so partition
    // indices stay 1:1 with the records arrays. Pre-flight validation
    // is the caller's responsibility — see ROADMAP-EDITORS Phase 0.1
    // for the surface contract.
    const upsertTasks: Promise<unknown>[] = [];
    const upsertRecords: AnnotationEditorRecord[] = [];
    for (const record of upsertCandidates) {
      const annotation = record.annotation;
      const isEditorial = getKindFromAnnotation(annotation) === 'editorial';
      const feature = a9sToBackendFeature(annotation, imageHeight);

      const positionsPayload = annotation._meta?.positions ?? [];
      const graphcomponentPayload = (annotation._meta?.graphcomponentSet ?? []).map((item) => ({
        component: item.component,
        features: item.features ?? [],
      }));
      const writePayload = isEditorial
        ? {
            annotation: feature,
            annotation_type: 'editorial' as const,
            allograph: null,
            hand: null,
            positions: [],
            graphcomponent_set: [],
            note: '',
            internal_note: getEditorialInternalNote(annotation),
          }
        : {
            annotation: feature,
            annotation_type: 'image' as const,
            allograph: annotation._meta?.allographId ?? null,
            hand: annotation._meta?.handId ?? null,
            positions: positionsPayload,
            graphcomponent_set: graphcomponentPayload,
            note: getStandardAnnotationNote(annotation),
            internal_note: '',
          };

      if (record.source === 'persisted' && isDbAnnotation(annotation)) {
        const id = dbIdFromA9s(annotation);
        if (id == null) continue;
        upsertTasks.push(updateViewerAnnotation(token, id, writePayload));
      } else {
        upsertTasks.push(
          createViewerAnnotation(token, {
            ...writePayload,
            item_image: Number(manuscriptImage.id),
          })
        );
      }
      upsertRecords.push(record);
    }

    const deleteTasks: Promise<unknown>[] = [];
    const deleteRecords: AnnotationEditorRecord[] = [];
    for (const record of deleteCandidates) {
      const id = dbIdFromA9s(record.annotation);
      if (id == null) continue;
      deleteTasks.push(deleteViewerAnnotation(token, id));
      deleteRecords.push(record);
    }

    // Per-task isolation: a single failure used to abort the whole save,
    // leaving succeeded records marked dirty and re-creating duplicates on
    // retry. allSettled keeps every commit and lets us report honestly.
    const upsertResults = await Promise.allSettled(upsertTasks);
    const deleteResults = await Promise.allSettled(deleteTasks);

    const partition = partitionSaveResults(
      upsertRecords,
      upsertResults,
      deleteRecords,
      deleteResults
    );

    const succeededTotal =
      partition.succeededUpsertRecordIds.size + partition.succeededDeleteRecordIds.size;
    const failedTotal = partition.failedUpsertRecordIds.size + partition.failedDeleteRecordIds.size;

    if (succeededTotal === 0) {
      return {
        kind: 'all-failed',
        failedCount: failedTotal,
        firstError: partition.firstError,
      };
    }

    // Refresh server state.
    let refreshed: Awaited<ReturnType<typeof fetchAnnotationsForImage>>;
    try {
      const refreshedImage = await fetchAnnotationsForImage(
        String(manuscriptImage.id),
        undefined,
        'image',
        token
      );
      const refreshedEditorial = canViewEditorialControls
        ? await fetchAnnotationsForImage(String(manuscriptImage.id), undefined, 'editorial', token)
        : [];
      refreshed = [...refreshedImage, ...refreshedEditorial];
    } catch (error) {
      return {
        kind: 'saved-but-refresh-failed',
        succeededCount: succeededTotal,
        message: error instanceof Error ? error.message : 'Failed to refresh annotations.',
      };
    }

    const mapped = refreshed.map((annotation) =>
      backendToA9sAnnotation(
        annotation,
        imageHeight,
        annotation.allograph != null ? allographNameById.get(annotation.allograph) : undefined
      )
    );

    const failedRecords = [
      ...upsertRecords.filter((r) => partition.failedUpsertRecordIds.has(r.id)),
      ...deleteRecords.filter((r) => partition.failedDeleteRecordIds.has(r.id)),
    ];
    const nextEditorRecords = mergeFailedRecordsIntoRefresh(
      buildHydratedEditorRecordMap(mapped),
      failedRecords
    );
    const seed = Object.values(nextEditorRecords)
      .filter((r) => !r.isDeleted)
      .map((r) => r.annotation);

    setEditorRecords(nextEditorRecords);

    if (failedTotal === 0) {
      return {
        kind: 'all-succeeded',
        counts: {
          created: partition.succeededCreatedCount,
          updated: partition.succeededUpdatedCount,
          deleted: partition.succeededDeletedCount,
        },
        seed,
      };
    }

    return {
      kind: 'partial',
      succeededCount: succeededTotal,
      failedCount: failedTotal,
      seed,
    };
  }, [
    token,
    manuscriptImage,
    imageHeight,
    allographNameById,
    viewerCapabilities,
    canViewEditorialControls,
    canPersistAnnotationKind,
    editorRecords,
  ]);

  return {
    editorRecords,
    a9sSnapshot,
    dirtyCount,
    isDirty,
    getCanonicalAnnotation,
    markCreated,
    markUpdated,
    markDeleted,
    markManyUpdated,
    replaceLocalAnnotation,
    resetFrom,
    saveAll,
  };
}
