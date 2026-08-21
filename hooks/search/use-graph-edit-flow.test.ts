import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import { useGraphEditFlow } from './use-graph-edit-flow';
import * as annotationsService from '@/services/annotations';
import * as manuscriptsService from '@/services/manuscripts';
import type { GraphListItem } from '@/types/search';

vi.mock('@/contexts/auth-context', () => ({
  useAuth: () => ({
    token: 'test-token',
    user: { id: 1, is_staff: true },
  }),
}));

describe('useGraphEditFlow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockSearchResults: GraphListItem[] = [
    {
      id: 101,
      item_part: 1,
      item_image: 10,
      image_iiif: 'http://iiif.test/img1',
      coordinates: '10,10,20,20',
      shelfmark: 'MS 1',
      repository_city: 'City',
      repository_name: 'Repo',
      date: '1200',
      is_annotated: true,
    },
    {
      id: 102,
      item_part: 1,
      item_image: 10,
      image_iiif: 'http://iiif.test/img1',
      coordinates: '30,30,40,40',
      shelfmark: 'MS 1',
      repository_city: 'City',
      repository_name: 'Repo',
      date: '1200',
      is_annotated: true,
    },
    {
      id: 201,
      item_part: 2,
      item_image: 20,
      image_iiif: 'http://iiif.test/img2',
      coordinates: '50,50,60,60',
      shelfmark: 'MS 2',
      repository_city: 'City',
      repository_name: 'Repo',
      date: '1250',
      is_annotated: true,
    },
  ];

  it('enables hand selection when all edited graphs belong to the same manuscript', async () => {
    vi.spyOn(annotationsService, 'fetchGraphsByIds').mockResolvedValue([
      { id: 101, item_part: 1, allograph: 5, hand: 10, positions: [], graphcomponent_set: [] },
      { id: 102, item_part: 1, allograph: 5, hand: 10, positions: [], graphcomponent_set: [] },
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

    const { result } = renderHook(() => useGraphEditFlow({ searchResults: mockSearchResults }));

    await act(async () => {
      await result.current.startEdit([101, 102]);
    });

    expect(result.current.dialogOpen).toBe(true);
    expect(result.current.handDisabled).toBe(false);
    expect(result.current.hands).toHaveLength(1);
    expect(result.current.hands[0].name).toBe('Hand 1');
  });

  it('disables hand selection when edited graphs span multiple manuscripts', async () => {
    vi.spyOn(annotationsService, 'fetchGraphsByIds').mockResolvedValue([
      { id: 101, item_part: 1, allograph: 5, hand: 10, positions: [], graphcomponent_set: [] },
      { id: 201, item_part: 2, allograph: 5, hand: 20, positions: [], graphcomponent_set: [] },
    ] as never);

    vi.spyOn(manuscriptsService, 'fetchAllographs').mockResolvedValue([
      { id: 5, name: 'a', components: [], positions: [] },
    ] as never);

    const fetchHandsSpy = vi.spyOn(manuscriptsService, 'fetchHands');

    const { result } = renderHook(() => useGraphEditFlow({ searchResults: mockSearchResults }));

    await act(async () => {
      await result.current.startEdit([101, 201]);
    });

    expect(result.current.dialogOpen).toBe(true);
    expect(result.current.handDisabled).toBe(true);
    expect(result.current.handDisabledReason).toBeDefined();
    expect(fetchHandsSpy).not.toHaveBeenCalled();
  });
});
