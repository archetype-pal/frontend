import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type UsePageSize = typeof import('./use-page-size').usePageSize;

const HANDS_KEY = 'backoffice-page-size:hands';

/** A fresh copy of the hook, as on a new page load: only what the browser stored carries over. */
async function loadPage(): Promise<UsePageSize> {
  vi.resetModules();
  return (await import('./use-page-size')).usePageSize;
}

describe('usePageSize', () => {
  let usePageSize: UsePageSize;

  beforeEach(async () => {
    window.localStorage.clear();
    usePageSize = await loadPage();
  });

  afterEach(() => vi.restoreAllMocks());

  it('starts at the fallback and remembers a change for the next visit', async () => {
    const { result } = renderHook(() => usePageSize('hands', 20));
    expect(result.current[0]).toBe(20);

    act(() => result.current[1](50));

    expect(result.current[0]).toBe(50);
    expect(window.localStorage.getItem(HANDS_KEY)).toBe('50');
    const nextVisit = await loadPage();
    expect(renderHook(() => nextVisit('hands', 20)).result.current[0]).toBe(50);
  });

  it('keeps each table to its own saved size', () => {
    window.localStorage.setItem('backoffice-page-size:scribes', '50');
    window.localStorage.setItem('backoffice-page-size:users', '100');
    const scribes = renderHook(() => usePageSize('scribes', 20));
    const users = renderHook(() => usePageSize('users', 20));

    expect(scribes.result.current[0]).toBe(50);
    expect(users.result.current[0]).toBe(100);

    act(() => scribes.result.current[1](20));

    expect(scribes.result.current[0]).toBe(20);
    expect(users.result.current[0]).toBe(100);
    expect(window.localStorage.getItem('backoffice-page-size:users')).toBe('100');
  });

  it('keeps an unnamed table to the current view', () => {
    const { result } = renderHook(() => usePageSize(null, 20));

    act(() => result.current[1](100));

    expect(result.current[0]).toBe(100);
    expect(window.localStorage.length).toBe(0);
  });

  it('keeps a size the browser cannot store for the rest of the visit', () => {
    window.localStorage.setItem(HANDS_KEY, '50');
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('The quota has been exceeded.', 'QuotaExceededError');
    });
    const first = renderHook(() => usePageSize('hands', 20));

    act(() => first.result.current[1](100));

    expect(first.result.current[0]).toBe(100);
    first.unmount();
    expect(renderHook(() => usePageSize('hands', 20)).result.current[0]).toBe(100);
  });

  it('still lets the user choose a size when the browser blocks storage', () => {
    vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => {
      throw new DOMException('Access is denied.', 'SecurityError');
    });
    const { result } = renderHook(() => usePageSize('hands', 20));
    expect(result.current[0]).toBe(20);

    act(() => result.current[1](50));

    expect(result.current[0]).toBe(50);
  });

  it('follows a size chosen in another tab', () => {
    const { result } = renderHook(() => usePageSize('hands', 20));
    act(() => result.current[1](50));

    window.localStorage.setItem(HANDS_KEY, '100');
    act(() => {
      window.dispatchEvent(new StorageEvent('storage', { key: HANDS_KEY }));
    });

    expect(result.current[0]).toBe(100);
  });
});
