import { describe, expect, it, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useShowThumbnails } from './use-show-thumbnails';

describe('useShowThumbnails', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('defaults to true when localStorage is empty', () => {
    const { result } = renderHook(() => useShowThumbnails());
    expect(result.current[0]).toBe(true);
  });

  it('hydrates saved preference from localStorage', () => {
    window.localStorage.setItem('search-show-thumbnails', 'false');
    const { result } = renderHook(() => useShowThumbnails());
    expect(result.current[0]).toBe(false);
  });

  it('updates state and persists to localStorage on change', () => {
    const { result } = renderHook(() => useShowThumbnails());
    expect(result.current[0]).toBe(true);

    act(() => {
      result.current[1](false);
    });

    expect(result.current[0]).toBe(false);
    expect(window.localStorage.getItem('search-show-thumbnails')).toBe('false');

    act(() => {
      result.current[1](true);
    });

    expect(result.current[0]).toBe(true);
    expect(window.localStorage.getItem('search-show-thumbnails')).toBe('true');
  });
});
