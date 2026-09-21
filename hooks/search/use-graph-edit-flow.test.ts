import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import { useGraphEditFlow } from './use-graph-edit-flow';
import * as annotationsService from '@/services/annotations';
import * as manuscriptsService from '@/services/manuscripts';

vi.mock('@/contexts/auth-context', () => ({
  useAuth: () => ({
    token: 'test-token',
    user: { id: 1, is_staff: true, is_superuser: false },
  }),
}));

describe('useGraphEditFlow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('enables hand selection when all edited graphs belong to the same manuscript', async () => {
    vi.spyOn(annotationsService, 'fetchGraphsByIds').mockResolvedValue([
      {
        id: 101,
        item_part: 1,
        image_iiif: 'http://iiif.test/img1',
        allograph: 5,
        hand: 10,
        positions: [],
        graphcomponent_set: [],
      },
      {
        id: 102,
        item_part: 1,
        image_iiif: 'http://iiif.test/img1',
        allograph: 5,
        hand: 10,
        positions: [],
        graphcomponent_set: [],
      },
    ] as never);

    vi.spyOn(manuscriptsService, 'fetchAllographs').mockResolvedValue([
      { id: 5, name: 'a', components: [], positions: [] },
    ] as never);

    vi.spyOn(manuscriptsService, 'fetchHands').mockResolvedValue({
      count: 1,
      next: null,
      previous: null,
      results: [{ id: 10, name: 'Hand 1' }],
    } as never);

    const { result } = renderHook(() => useGraphEditFlow());

    await act(async () => {
      await result.current.startEdit([101, 102]);
    });

    expect(result.current.dialogOpen).toBe(true);
    expect(result.current.handDisabled).toBe(false);
    expect(result.current.hands).toHaveLength(1);
    expect(result.current.hands[0].name).toBe('Hand 1');
  });

  it('leaves editorial graphs out of the edit for a non-superuser', async () => {
    vi.spyOn(annotationsService, 'fetchGraphsByIds').mockResolvedValue([
      {
        id: 101,
        item_part: 1,
        annotation_type: 'image',
        allograph: 5,
        positions: [],
        graphcomponent_set: [],
      },
      {
        id: 102,
        item_part: 1,
        annotation_type: 'editorial',
        allograph: 5,
        positions: [],
        graphcomponent_set: [],
      },
    ] as never);
    vi.spyOn(manuscriptsService, 'fetchAllographs').mockResolvedValue([
      { id: 5, name: 'a', components: [], positions: [] },
    ] as never);
    vi.spyOn(manuscriptsService, 'fetchHands').mockResolvedValue({
      count: 0,
      next: null,
      previous: null,
      results: [],
    } as never);

    const { result } = renderHook(() => useGraphEditFlow());
    await act(async () => {
      await result.current.startEdit([101, 102]);
    });

    expect(result.current.dialogOpen).toBe(true);
    expect(result.current.editingGraphs.map((g) => g.id)).toEqual([101]);
  });

  it('does not open the dialog when a non-superuser selected only editorial graphs', async () => {
    vi.spyOn(annotationsService, 'fetchGraphsByIds').mockResolvedValue([
      {
        id: 102,
        item_part: 1,
        annotation_type: 'editorial',
        allograph: 5,
        positions: [],
        graphcomponent_set: [],
      },
    ] as never);

    const { result } = renderHook(() => useGraphEditFlow());
    await act(async () => {
      await result.current.startEdit([102]);
    });

    expect(result.current.dialogOpen).toBe(false);
    expect(result.current.editingGraphs).toEqual([]);
  });

  it('disables hand selection when edited graphs span multiple manuscripts', async () => {
    vi.spyOn(annotationsService, 'fetchGraphsByIds').mockResolvedValue([
      {
        id: 101,
        item_part: 1,
        image_iiif: 'http://iiif.test/img1',
        allograph: 5,
        hand: 10,
        positions: [],
        graphcomponent_set: [],
      },
      {
        id: 201,
        item_part: 2,
        image_iiif: 'http://iiif.test/img2',
        allograph: 5,
        hand: 20,
        positions: [],
        graphcomponent_set: [],
      },
    ] as never);

    vi.spyOn(manuscriptsService, 'fetchAllographs').mockResolvedValue([
      { id: 5, name: 'a', components: [], positions: [] },
    ] as never);

    const fetchHandsSpy = vi.spyOn(manuscriptsService, 'fetchHands');

    const { result } = renderHook(() => useGraphEditFlow());

    await act(async () => {
      await result.current.startEdit([101, 201]);
    });

    expect(result.current.dialogOpen).toBe(true);
    expect(result.current.handDisabled).toBe(true);
    expect(result.current.handDisabledReason).toBeDefined();
    expect(fetchHandsSpy).not.toHaveBeenCalled();
  });

  it('keeps each hydrated graph carrying its own image_iiif rather than one shared image', async () => {
    // Regression test: the preview strip used to be handed a single dialog-level
    // image (derived from just the first selected graph) and applied it to every
    // graph in the selection, which crops the wrong region — or fails outright —
    // for any graph that isn't actually from that first image. Each graph must
    // resolve its own image; there is no dialog-level fallback for this feature.
    vi.spyOn(annotationsService, 'fetchGraphsByIds').mockResolvedValue([
      {
        id: 101,
        item_part: 1,
        image_iiif: 'http://iiif.test/img1',
        allograph: 5,
        hand: 10,
        positions: [],
        graphcomponent_set: [],
      },
      {
        id: 201,
        item_part: 2,
        image_iiif: 'http://iiif.test/img2',
        allograph: 5,
        hand: 20,
        positions: [],
        graphcomponent_set: [],
      },
    ] as never);

    vi.spyOn(manuscriptsService, 'fetchAllographs').mockResolvedValue([
      { id: 5, name: 'a', components: [], positions: [] },
    ] as never);

    const { result } = renderHook(() => useGraphEditFlow());

    await act(async () => {
      await result.current.startEdit([101, 201]);
    });

    expect(result.current.editingGraphs.map((g) => g.image_iiif)).toEqual([
      'http://iiif.test/img1',
      'http://iiif.test/img2',
    ]);
  });
});
