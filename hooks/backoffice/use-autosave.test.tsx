import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// jsdom in this project doesn't ship Storage; install a shim.
function installStorageShim() {
  const store = new Map<string, string>();
  const shim: Storage = {
    get length() {
      return store.size;
    },
    clear: () => store.clear(),
    getItem: (k) => (store.has(k) ? (store.get(k) as string) : null),
    key: (i) => Array.from(store.keys())[i] ?? null,
    removeItem: (k) => {
      store.delete(k);
    },
    setItem: (k, v) => {
      store.set(k, String(v));
    },
  };
  Object.defineProperty(window, 'localStorage', {
    value: shim,
    configurable: true,
    writable: true,
  });
}

installStorageShim();

import { useAutosave } from './use-autosave';

const KEY = 'publication:my-slug';
const STORAGE_KEY = `archetype_autosave_${KEY}`;

beforeEach(() => {
  window.localStorage.clear();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  window.localStorage.clear();
});

describe('useAutosave', () => {
  it('starts idle and exposes no draft when storage is empty', () => {
    const { result } = renderHook(() => useAutosave(KEY, { title: 'x' }, false));
    expect(result.current.status).toBe('idle');
    expect(result.current.lastSavedAt).toBeNull();
    expect(result.current.getDraftInfo()).toEqual({ exists: false, savedAt: null });
    expect(result.current.recover()).toBeNull();
  });

  it('manual save() writes the current data and flips status to "saved"', () => {
    const { result } = renderHook(() => useAutosave(KEY, { title: 'hello' }, false));
    act(() => result.current.save());
    expect(result.current.status).toBe('saved');
    expect(result.current.lastSavedAt).toBeTypeOf('number');
    const raw = window.localStorage.getItem(STORAGE_KEY);
    expect(raw).not.toBeNull();
    expect(JSON.parse(raw!)).toMatchObject({ data: { title: 'hello' } });
  });

  it('periodic save fires on the interval when dirty=true and persists the LATEST data', () => {
    // Why the latest: the hook holds a ref to data and writes through dataRef
    // on each save, so a parent that mutates `data` between intervals must
    // still get the freshest snapshot persisted, not the value captured at
    // the time the interval was registered.
    const { result, rerender } = renderHook(
      ({ data, dirty }: { data: { v: string }; dirty: boolean }) =>
        useAutosave(KEY, data, dirty, 1_000),
      { initialProps: { data: { v: 'first' }, dirty: true } }
    );

    rerender({ data: { v: 'second' }, dirty: true });

    act(() => {
      vi.advanceTimersByTime(1_000); // interval fires → status 'saving'
    });
    expect(result.current.status).toBe('saving');

    act(() => {
      vi.advanceTimersByTime(300); // inner timer flushes the write
    });
    expect(result.current.status).toBe('saved');
    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY)!).data).toEqual({ v: 'second' });
  });

  it('flipping dirty back to false cancels a pending inner save timer', () => {
    // Regression net for the "stale draft" race the hook's comment warns
    // about: a manual server save flips dirty=false right as the 300ms
    // inner timer was about to write. If cleanup didn't cancel the inner
    // timer, the next page load would offer to recover an already-saved
    // record.
    const { rerender } = renderHook(
      ({ dirty }: { dirty: boolean }) => useAutosave(KEY, { v: 'x' }, dirty, 1_000),
      { initialProps: { dirty: true } }
    );

    act(() => {
      vi.advanceTimersByTime(1_000); // interval fires, schedules 300ms write
    });

    rerender({ dirty: false }); // cleanup must cancel the pending inner timer

    act(() => {
      vi.advanceTimersByTime(500); // generous window past the 300ms inner timer
    });
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('does not start the interval when dirty=false', () => {
    renderHook(() => useAutosave(KEY, { v: 'x' }, false, 1_000));
    act(() => {
      vi.advanceTimersByTime(5_000);
    });
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('status returns to idle when dirty flips back to false', () => {
    const { result, rerender } = renderHook(
      ({ dirty }: { dirty: boolean }) => useAutosave(KEY, { v: 'x' }, dirty, 1_000),
      { initialProps: { dirty: true } }
    );
    act(() => result.current.save());
    expect(result.current.status).toBe('saved');

    rerender({ dirty: false });
    expect(result.current.status).toBe('idle');
  });

  it('recover() returns the saved payload', () => {
    const { result } = renderHook(() => useAutosave(KEY, { v: 'fresh' }, false));
    act(() => result.current.save());
    expect(result.current.recover()).toEqual({ v: 'fresh' });
  });

  it('recover() returns null when storage holds malformed JSON', () => {
    window.localStorage.setItem(STORAGE_KEY, '{not json');
    const { result } = renderHook(() => useAutosave(KEY, { v: 'x' }, false));
    expect(result.current.recover()).toBeNull();
    expect(result.current.getDraftInfo()).toEqual({ exists: false, savedAt: null });
  });

  it('recover() returns null when storage holds `null` (shape validation)', () => {
    // Pre-fix, JSON.parse('null') returned null and was passed through as the
    // recovered data — the editor would then offer to "restore" a draft that
    // doesn't actually exist. The isAutosavePayload guard rejects it.
    window.localStorage.setItem(STORAGE_KEY, 'null');
    const { result } = renderHook(() => useAutosave(KEY, { v: 'x' }, false));
    expect(result.current.recover()).toBeNull();
    expect(result.current.getDraftInfo()).toEqual({ exists: false, savedAt: null });
  });

  it('recover() returns null when storage holds an array (shape validation)', () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([1, 2, 3]));
    const { result } = renderHook(() => useAutosave(KEY, { v: 'x' }, false));
    expect(result.current.recover()).toBeNull();
  });

  it('recover() returns null when payload is missing savedAt', () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ data: { v: 'x' } }));
    const { result } = renderHook(() => useAutosave(KEY, { v: 'y' }, false));
    expect(result.current.recover()).toBeNull();
  });

  it('recover() returns null when savedAt is not a number (old format)', () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ data: { v: 'x' }, savedAt: '2024-01-01' })
    );
    const { result } = renderHook(() => useAutosave(KEY, { v: 'y' }, false));
    expect(result.current.recover()).toBeNull();
  });

  it('getDraftInfo() reports the saved timestamp when a valid draft exists', () => {
    const { result } = renderHook(() => useAutosave(KEY, { v: 'x' }, false));
    act(() => result.current.save());
    const info = result.current.getDraftInfo();
    expect(info.exists).toBe(true);
    expect(info.savedAt).toBeTypeOf('number');
  });

  it('discard() clears storage and resets status', () => {
    const { result } = renderHook(() => useAutosave(KEY, { v: 'x' }, false));
    act(() => result.current.save());
    expect(window.localStorage.getItem(STORAGE_KEY)).not.toBeNull();

    act(() => result.current.discard());
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(result.current.status).toBe('idle');
    expect(result.current.lastSavedAt).toBeNull();
  });

  it('save() silently absorbs localStorage failures (quota / private mode)', () => {
    const originalSet = window.localStorage.setItem.bind(window.localStorage);
    vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => {
      throw new DOMException('QuotaExceededError', 'QuotaExceededError');
    });
    const { result } = renderHook(() => useAutosave(KEY, { v: 'x' }, false));
    expect(() => act(() => result.current.save())).not.toThrow();
    // Status stays at idle because the catch swallowed before setStatus('saved').
    expect(result.current.status).toBe('idle');

    // Restore for cleanup.
    vi.spyOn(window.localStorage, 'setItem').mockImplementation(originalSet);
  });

  it('unmount cancels the interval — no further writes happen', () => {
    const { unmount } = renderHook(() => useAutosave(KEY, { v: 'x' }, true, 1_000));
    unmount();
    act(() => {
      vi.advanceTimersByTime(10_000);
    });
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('different keys are isolated', () => {
    const { result: a } = renderHook(() => useAutosave('publication:a', { v: 'a' }, false));
    const { result: b } = renderHook(() => useAutosave('publication:b', { v: 'b' }, false));
    act(() => a.current.save());
    expect(b.current.recover()).toBeNull();
    expect(a.current.recover()).toEqual({ v: 'a' });
  });
});
