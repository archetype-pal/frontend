import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useDebouncedSearch } from './use-debounced-search';

describe('useDebouncedSearch', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('searches for the typed text once typing pauses, starting over at the first page', () => {
    const { result } = renderHook(() => useDebouncedSearch(300));
    act(() => result.current.setPage(3));

    act(() => result.current.setSearchInput('charter'));
    act(() => vi.advanceTimersByTime(299));
    expect(result.current.search).toBe('');
    expect(result.current.page).toBe(3);

    act(() => vi.advanceTimersByTime(1));
    expect(result.current.search).toBe('charter');
    expect(result.current.page).toBe(0);
  });

  it('keeps the page the user picked while the search text is unchanged', () => {
    const { result } = renderHook(() => useDebouncedSearch(300, 'charter'));

    act(() => result.current.setPage(2));
    act(() => vi.advanceTimersByTime(1000));

    expect(result.current.search).toBe('charter');
    expect(result.current.page).toBe(2);
  });
});
