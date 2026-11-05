import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useNow } from './use-now';

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-11-05T10:00:00Z'));
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useNow', () => {
  it('reads the time at once, then a second at a time', () => {
    const { result } = renderHook(() => useNow());
    const start = Date.parse('2026-11-05T10:00:00Z');
    expect(result.current).toBe(start);

    act(() => vi.advanceTimersByTime(1000));
    expect(result.current).toBe(start + 1000);

    act(() => vi.advanceTimersByTime(2500));
    expect(result.current).toBe(start + 3000);
  });

  it('serves every caller from one timer, and runs none once nobody shows the time', () => {
    const first = renderHook(() => useNow());
    const second = renderHook(() => useNow());
    expect(vi.getTimerCount()).toBe(1);

    first.unmount();
    expect(vi.getTimerCount()).toBe(1);
    second.unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('does not tick while inactive', () => {
    renderHook(() => useNow(false));

    expect(vi.getTimerCount()).toBe(0);
  });
});
