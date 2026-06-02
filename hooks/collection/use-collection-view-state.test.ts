import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useCollectionViewState } from './use-collection-view-state';

const navigation = vi.hoisted(() => ({
  searchParams: new URLSearchParams(),
}));

vi.mock('next/navigation', () => ({
  useSearchParams: () => navigation.searchParams,
}));

describe('useCollectionViewState', () => {
  beforeEach(() => {
    navigation.searchParams = new URLSearchParams();
    window.history.replaceState(null, '', '/collection');
  });

  it('uses grid view by default', () => {
    const { result } = renderHook(() => useCollectionViewState([], vi.fn()));

    expect(result.current.view).toBe('grid');
  });

  it('restores table view with the existing filter and sort from the URL', () => {
    navigation.searchParams = new URLSearchParams('view=table&filter=graph&sort=repository');

    const { result } = renderHook(() => useCollectionViewState([], vi.fn()));

    expect(result.current.view).toBe('table');
    expect(result.current.filter).toBe('graph');
    expect(result.current.sortBy).toBe('repository');
  });

  it('writes the selected view, filter, and sort to the URL', async () => {
    const { result } = renderHook(() => useCollectionViewState([], vi.fn()));

    act(() => {
      result.current.setView('table');
      result.current.setFilter('image');
      result.current.setSortBy('name');
    });

    await waitFor(() => {
      expect(window.location.search).toBe('?filter=image&sort=name&view=table');
    });
  });
});
