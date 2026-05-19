import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  useAnnotationEditorState,
  type UseAnnotationEditorStateArgs,
} from './use-annotation-editor-state';
import type { A9sWithMeta, ViewerCapabilities } from '@/types/annotation-viewer';

vi.mock('@/services/annotations', () => ({
  createViewerAnnotation: vi.fn(),
  updateViewerAnnotation: vi.fn(),
  deleteViewerAnnotation: vi.fn(),
  fetchAnnotationsForImage: vi.fn(),
}));

import {
  createViewerAnnotation,
  deleteViewerAnnotation,
  fetchAnnotationsForImage,
} from '@/services/annotations';

function makeAnnotation(id: string, meta: A9sWithMeta['_meta'] = {}): A9sWithMeta {
  return {
    id,
    type: 'Annotation',
    target: { selector: { type: 'FragmentSelector', value: 'xywh=pixel:1,2,3,4' } },
    _meta: meta,
  } as A9sWithMeta;
}

function makeCaps(overrides: Partial<ViewerCapabilities> = {}): ViewerCapabilities {
  return {
    canCreatePublicAnnotations: true,
    canPersistPublicAnnotations: true,
    canCreateEditorialAnnotations: true,
    canPersistEditorialAnnotations: true,
    canDeleteAnnotations: true,
    canModifyAnnotations: true,
    canViewEditorialControls: true,
    canUseSettings: true,
    canUseEditorSettings: true,
    ...overrides,
  } as ViewerCapabilities;
}

function makeArgs(
  overrides: Partial<UseAnnotationEditorStateArgs> = {}
): UseAnnotationEditorStateArgs {
  return {
    token: 'tok',
    manuscriptImage: { id: 42 } as UseAnnotationEditorStateArgs['manuscriptImage'],
    imageHeight: 100,
    allographNameById: new Map(),
    viewerCapabilities: makeCaps(),
    canViewEditorialControls: true,
    canPersistAnnotationKind: () => true,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useAnnotationEditorState — initial state + derived', () => {
  it('starts empty: no records, empty snapshot, dirtyCount=0, !isDirty', () => {
    const { result } = renderHook(() => useAnnotationEditorState(makeArgs()));
    expect(result.current.editorRecords).toEqual({});
    expect(result.current.a9sSnapshot).toEqual([]);
    expect(result.current.dirtyCount).toBe(0);
    expect(result.current.isDirty).toBe(false);
  });

  it('a9sSnapshot is derived: filters out deleted records', () => {
    const { result } = renderHook(() => useAnnotationEditorState(makeArgs()));
    act(() => {
      result.current.resetFrom([makeAnnotation('db:1'), makeAnnotation('db:2')]);
    });
    expect(result.current.a9sSnapshot.map((a) => a.id).sort()).toEqual(['db:1', 'db:2']);

    act(() => {
      result.current.markDeleted('db:1');
    });
    expect(result.current.a9sSnapshot.map((a) => a.id)).toEqual(['db:2']);
    // The record stays in the map (persisted-deleted), just hidden from snapshot.
    expect(result.current.editorRecords['db:1']).toBeDefined();
    expect(result.current.editorRecords['db:1'].isDeleted).toBe(true);
  });

  it('getCanonicalAnnotation returns the record annotation when present, input otherwise', () => {
    const { result } = renderHook(() => useAnnotationEditorState(makeArgs()));
    const original = makeAnnotation('db:1', { allographId: 5 });
    act(() => {
      result.current.resetFrom([original]);
    });
    act(() => {
      result.current.markUpdated(makeAnnotation('db:1', { allographId: 99 }));
    });
    // Stale input → returns the canonical (latest) annotation.
    const canonical = result.current.getCanonicalAnnotation(original);
    expect(canonical._meta?.allographId).toBe(99);

    // Unknown annotation → returns input.
    const stranger = makeAnnotation('unknown');
    expect(result.current.getCanonicalAnnotation(stranger)).toBe(stranger);
  });
});

describe('mark* mutations', () => {
  it('markCreated marks a fresh draft as created (dirty)', () => {
    const { result } = renderHook(() => useAnnotationEditorState(makeArgs()));
    act(() => {
      result.current.markCreated(makeAnnotation('local-1'));
    });
    expect(result.current.dirtyCount).toBe(1);
    expect(result.current.editorRecords['local-1'].dirtyState).toBe('created');
  });

  it('markUpdated (immediate) flips a persisted record to updated', () => {
    const { result } = renderHook(() => useAnnotationEditorState(makeArgs()));
    act(() => {
      result.current.resetFrom([makeAnnotation('db:1')]);
    });
    act(() => {
      result.current.markUpdated(makeAnnotation('db:1', { allographId: 5 }));
    });
    expect(result.current.editorRecords['db:1'].dirtyState).toBe('updated');
  });

  it('markUpdated debounced buffers and flushes on the trailing edge', () => {
    const { result } = renderHook(() => useAnnotationEditorState(makeArgs()));
    act(() => {
      result.current.resetFrom([makeAnnotation('db:1', { allographId: 1 })]);
    });

    // Fire many drag-frame updates rapidly.
    act(() => {
      result.current.markUpdated(makeAnnotation('db:1', { allographId: 2 }), { debounced: true });
      result.current.markUpdated(makeAnnotation('db:1', { allographId: 3 }), { debounced: true });
      result.current.markUpdated(makeAnnotation('db:1', { allographId: 4 }), { debounced: true });
    });
    // Buffered → record's annotation still reflects the pre-debounce value.
    expect(
      (result.current.editorRecords['db:1'].annotation as A9sWithMeta)._meta?.allographId
    ).toBe(1);

    // Advance past the flush window.
    act(() => {
      vi.advanceTimersByTime(60);
    });
    // After flush, only the last value is committed (merged on top of prior).
    expect(
      (result.current.editorRecords['db:1'].annotation as A9sWithMeta)._meta?.allographId
    ).toBe(4);
  });

  it('markDeleted on a draft removes it outright; on a persisted record marks isDeleted', () => {
    const { result } = renderHook(() => useAnnotationEditorState(makeArgs()));
    act(() => {
      result.current.markCreated(makeAnnotation('local-1'));
      result.current.resetFrom([makeAnnotation('db:1')]);
    });

    act(() => {
      result.current.markDeleted('db:1');
    });
    expect(result.current.editorRecords['db:1']?.isDeleted).toBe(true);

    act(() => {
      result.current.markCreated(makeAnnotation('local-2'));
      result.current.markDeleted('local-2');
    });
    expect(result.current.editorRecords['local-2']).toBeUndefined();
  });
});

describe('saveAll — early-return outcomes', () => {
  it('returns no-token when token is null', async () => {
    const { result } = renderHook(() => useAnnotationEditorState(makeArgs({ token: null })));
    await expect(result.current.saveAll()).resolves.toEqual({ kind: 'no-token' });
  });

  it('returns no-image when manuscriptImage is null', async () => {
    const { result } = renderHook(() =>
      useAnnotationEditorState(makeArgs({ manuscriptImage: null }))
    );
    await expect(result.current.saveAll()).resolves.toEqual({ kind: 'no-image' });
  });

  it('returns no-capability when neither persist flag is set', async () => {
    const { result } = renderHook(() =>
      useAnnotationEditorState(
        makeArgs({
          viewerCapabilities: makeCaps({
            canPersistPublicAnnotations: false,
            canPersistEditorialAnnotations: false,
          }),
        })
      )
    );
    await expect(result.current.saveAll()).resolves.toEqual({ kind: 'no-capability' });
  });

  it('returns no-changes when nothing is dirty', async () => {
    const { result } = renderHook(() => useAnnotationEditorState(makeArgs()));
    act(() => {
      result.current.resetFrom([makeAnnotation('db:1')]);
    });
    await expect(result.current.saveAll()).resolves.toEqual({ kind: 'no-changes' });
  });
});

describe('saveAll — network outcomes', () => {
  it('all-succeeded: returns counts + seed, replaces records from refetch', async () => {
    vi.mocked(createViewerAnnotation).mockResolvedValue({ id: 100 } as never);
    vi.mocked(fetchAnnotationsForImage).mockImplementation(async (_id, _allo, type) =>
      type === 'editorial'
        ? []
        : [
            {
              id: 100,
              item_image: 42,
              annotation_type: 'image',
              annotation: {
                type: 'Feature',
                geometry: {
                  type: 'Polygon',
                  coordinates: [
                    [
                      [0, 90],
                      [0, 100],
                      [10, 100],
                      [10, 90],
                      [0, 90],
                    ],
                  ],
                },
                properties: {},
              },
              allograph: null,
              hand: null,
              positions: [],
              position_details: [],
              graphcomponent_set: [],
            } as never,
          ]
    );

    const { result } = renderHook(() => useAnnotationEditorState(makeArgs()));
    act(() => {
      result.current.markCreated(makeAnnotation('local-1'));
    });

    let outcome: Awaited<ReturnType<typeof result.current.saveAll>>;
    await act(async () => {
      outcome = await result.current.saveAll();
    });

    expect(outcome!.kind).toBe('all-succeeded');
    if (outcome!.kind !== 'all-succeeded') throw new Error('narrowing');
    expect(outcome!.counts).toEqual({ created: 1, updated: 0, deleted: 0 });
    expect(outcome!.seed.map((a) => a.id)).toEqual(['db:100']);
    // Records were replaced — original draft is gone, refetched record present.
    expect(result.current.editorRecords['local-1']).toBeUndefined();
    expect(result.current.editorRecords['db:100']).toBeDefined();
    expect(result.current.editorRecords['db:100'].dirtyState).toBe('clean');
  });

  it('all-failed: returns failed count + firstError; records stay dirty', async () => {
    vi.mocked(createViewerAnnotation).mockRejectedValue(new Error('500 internal'));

    const { result } = renderHook(() => useAnnotationEditorState(makeArgs()));
    act(() => {
      result.current.markCreated(makeAnnotation('local-1'));
    });

    let outcome: Awaited<ReturnType<typeof result.current.saveAll>>;
    await act(async () => {
      outcome = await result.current.saveAll();
    });

    expect(outcome!.kind).toBe('all-failed');
    if (outcome!.kind !== 'all-failed') throw new Error('narrowing');
    expect(outcome!.failedCount).toBe(1);
    expect(outcome!.firstError).toBe('500 internal');
    // No refetch should have happened — server state unchanged.
    expect(fetchAnnotationsForImage).not.toHaveBeenCalled();
    // Record still dirty for retry.
    expect(result.current.editorRecords['local-1'].dirtyState).toBe('created');
  });

  it('partial: preserves failed records, replaces succeeded with server entries', async () => {
    // Two creates: first succeeds (→ db:100), second fails.
    vi.mocked(createViewerAnnotation)
      .mockResolvedValueOnce({ id: 100 } as never)
      .mockRejectedValueOnce(new Error('boom'));
    vi.mocked(fetchAnnotationsForImage).mockImplementation(async (_id, _allo, type) =>
      type === 'editorial'
        ? []
        : [
            {
              id: 100,
              item_image: 42,
              annotation_type: 'image',
              annotation: {
                type: 'Feature',
                geometry: {
                  type: 'Polygon',
                  coordinates: [
                    [
                      [0, 90],
                      [0, 100],
                      [10, 100],
                      [10, 90],
                      [0, 90],
                    ],
                  ],
                },
                properties: {},
              },
              allograph: null,
              hand: null,
              positions: [],
              position_details: [],
              graphcomponent_set: [],
            } as never,
          ]
    );

    const { result } = renderHook(() => useAnnotationEditorState(makeArgs()));
    act(() => {
      result.current.markCreated(makeAnnotation('local-1'));
      result.current.markCreated(makeAnnotation('local-2'));
    });

    let outcome: Awaited<ReturnType<typeof result.current.saveAll>>;
    await act(async () => {
      outcome = await result.current.saveAll();
    });

    expect(outcome!.kind).toBe('partial');
    if (outcome!.kind !== 'partial') throw new Error('narrowing');
    expect(outcome!.succeededCount).toBe(1);
    expect(outcome!.failedCount).toBe(1);

    // db:100 from server, local-2 preserved as dirty.
    expect(result.current.editorRecords['db:100']).toBeDefined();
    expect(result.current.editorRecords['local-2']).toBeDefined();
    expect(result.current.editorRecords['local-2'].dirtyState).toBe('created');
    // The succeeded local-1 record should be gone (server replaced it).
    expect(result.current.editorRecords['local-1']).toBeUndefined();
  });

  it('saved-but-refresh-failed: refetch throws after at least one success', async () => {
    vi.mocked(createViewerAnnotation).mockResolvedValue({ id: 100 } as never);
    vi.mocked(fetchAnnotationsForImage).mockRejectedValue(new Error('network'));

    const { result } = renderHook(() => useAnnotationEditorState(makeArgs()));
    act(() => {
      result.current.markCreated(makeAnnotation('local-1'));
    });

    let outcome: Awaited<ReturnType<typeof result.current.saveAll>>;
    await act(async () => {
      outcome = await result.current.saveAll();
    });

    expect(outcome!.kind).toBe('saved-but-refresh-failed');
    if (outcome!.kind !== 'saved-but-refresh-failed') throw new Error('narrowing');
    expect(outcome!.succeededCount).toBe(1);
    expect(outcome!.message).toBe('network');
  });

  it('skips delete tasks for records without a db id', async () => {
    const { result } = renderHook(() => useAnnotationEditorState(makeArgs()));
    // Persisted record (db:1) becomes marked deleted — goes through delete path.
    // A draft also marked-deleted (local-1) is removed in-place by markDeleted
    // and never reaches save. So saveAll has 1 delete to send.
    act(() => {
      result.current.resetFrom([makeAnnotation('db:1')]);
    });
    act(() => {
      result.current.markDeleted('db:1');
    });
    vi.mocked(deleteViewerAnnotation).mockResolvedValue(undefined as never);
    vi.mocked(fetchAnnotationsForImage).mockResolvedValue([]);

    await act(async () => {
      await result.current.saveAll();
    });
    expect(deleteViewerAnnotation).toHaveBeenCalledTimes(1);
  });

  it('skips upserts on records whose kind canPersistAnnotationKind rejects', async () => {
    const { result } = renderHook(() =>
      useAnnotationEditorState(
        makeArgs({
          canPersistAnnotationKind: () => false,
        })
      )
    );
    act(() => {
      result.current.markCreated(makeAnnotation('local-1'));
    });
    // No persistable candidates → no-changes (since nothing made it through).
    await expect(result.current.saveAll()).resolves.toEqual({ kind: 'no-changes' });
    expect(createViewerAnnotation).not.toHaveBeenCalled();
  });
});
