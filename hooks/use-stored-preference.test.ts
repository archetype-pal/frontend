import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { parseBoolean } from './use-stored-preference';

type UseStoredPreference = typeof import('./use-stored-preference').useStoredPreference;

const KEY = 'test-preference';
const serialize = (value: boolean) => (value ? 'true' : 'false');
const parse = (raw: string | null) => parseBoolean(raw, true);

/** A fresh copy of the hook, as on a new page load: only what the browser stored carries over. */
async function loadPage(): Promise<UseStoredPreference> {
  vi.resetModules();
  return (await import('./use-stored-preference')).useStoredPreference;
}

describe('useStoredPreference', () => {
  let useStoredPreference: UseStoredPreference;

  beforeEach(async () => {
    window.localStorage.clear();
    useStoredPreference = await loadPage();
  });

  afterEach(() => vi.restoreAllMocks());

  it('starts at the default and remembers a change for the next visit', async () => {
    const { result } = renderHook(() => useStoredPreference(KEY, parse, serialize, true));
    expect(result.current[0]).toBe(true);

    act(() => result.current[1](false));

    expect(result.current[0]).toBe(false);
    expect(window.localStorage.getItem(KEY)).toBe('false');
    const nextVisit = await loadPage();
    expect(renderHook(() => nextVisit(KEY, parse, serialize, true)).result.current[0]).toBe(false);
  });

  it('re-reads when the key changes', () => {
    window.localStorage.setItem('pref:a', 'false');
    const { result, rerender } = renderHook(
      ({ key }) => useStoredPreference(key, parse, serialize, true),
      { initialProps: { key: 'pref:a' } }
    );
    expect(result.current[0]).toBe(false);

    rerender({ key: 'pref:b' });

    expect(result.current[0]).toBe(true);
  });

  it('keeps a value the browser cannot store for the rest of the visit', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('The quota has been exceeded.', 'QuotaExceededError');
    });
    const first = renderHook(() => useStoredPreference(KEY, parse, serialize, true));

    act(() => first.result.current[1](false));

    expect(first.result.current[0]).toBe(false);
    first.unmount();
    expect(
      renderHook(() => useStoredPreference(KEY, parse, serialize, true)).result.current[0]
    ).toBe(false);
  });

  it('still works when the browser blocks storage', () => {
    vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => {
      throw new DOMException('Access is denied.', 'SecurityError');
    });
    const { result } = renderHook(() => useStoredPreference(KEY, parse, serialize, true));
    expect(result.current[0]).toBe(true);

    act(() => result.current[1](false));

    expect(result.current[0]).toBe(false);
  });

  it('follows a value chosen in another tab', () => {
    const { result } = renderHook(() => useStoredPreference(KEY, parse, serialize, true));
    act(() => result.current[1](true));

    window.localStorage.setItem(KEY, 'false');
    act(() => {
      window.dispatchEvent(new StorageEvent('storage', { key: KEY }));
    });

    expect(result.current[0]).toBe(false);
  });
});

describe('parseBoolean', () => {
  it.each([
    ['true', false, true],
    ['false', true, false],
    [null, true, true],
    ['yes', false, false],
  ])('reads %s with fallback %s as %s', (raw, fallback, expected) => {
    expect(parseBoolean(raw, fallback)).toBe(expected);
  });
});
