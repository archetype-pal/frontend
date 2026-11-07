import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useHiddenTooLong } from './use-hidden-too-long';

let visibility: DocumentVisibilityState = 'visible';

function setVisibility(next: DocumentVisibilityState) {
  visibility = next;
  act(() => {
    document.dispatchEvent(new Event('visibilitychange'));
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  visibility = 'visible';
  Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    get: () => visibility,
  });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useHiddenTooLong', () => {
  it('is false while the page is in view', () => {
    const { result } = renderHook(() => useHiddenTooLong(1000));

    act(() => vi.advanceTimersByTime(5000));

    expect(result.current).toBe(false);
  });

  it('turns true once the page has been hidden for the limit, and not before', () => {
    const { result } = renderHook(() => useHiddenTooLong(1000));

    setVisibility('hidden');
    act(() => vi.advanceTimersByTime(999));
    expect(result.current).toBe(false);

    act(() => vi.advanceTimersByTime(1));
    expect(result.current).toBe(true);
  });

  it('turns false and says so the moment the page is shown again', () => {
    const onShown = vi.fn();
    const { result } = renderHook(() => useHiddenTooLong(1000, onShown));
    setVisibility('hidden');
    act(() => vi.advanceTimersByTime(1000));

    setVisibility('visible');

    expect(result.current).toBe(false);
    expect(onShown).toHaveBeenCalledTimes(1);
  });

  it('starts counting again for each time the page is hidden', () => {
    const { result } = renderHook(() => useHiddenTooLong(1000));

    setVisibility('hidden');
    act(() => vi.advanceTimersByTime(600));
    setVisibility('visible');
    setVisibility('hidden');
    act(() => vi.advanceTimersByTime(600));

    expect(result.current).toBe(false);
  });

  it('counts from the start when the page opens hidden', () => {
    visibility = 'hidden';
    const { result } = renderHook(() => useHiddenTooLong(1000));

    act(() => vi.advanceTimersByTime(1000));

    expect(result.current).toBe(true);
  });

  it('calls the latest callback it was given', () => {
    const first = vi.fn();
    const second = vi.fn();
    const { rerender } = renderHook(({ onShown }) => useHiddenTooLong(1000, onShown), {
      initialProps: { onShown: first },
    });
    rerender({ onShown: second });

    setVisibility('hidden');
    setVisibility('visible');

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });

  it('stops listening once unmounted', () => {
    const onShown = vi.fn();
    const { unmount } = renderHook(() => useHiddenTooLong(1000, onShown));
    unmount();

    setVisibility('hidden');
    setVisibility('visible');

    expect(onShown).not.toHaveBeenCalled();
  });
});
