import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

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

import { useRecentEntities } from './use-recent-entities';

const STORAGE_KEY = 'backoffice:recent-entities';

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  window.localStorage.clear();
});

describe('useRecentEntities', () => {
  it('starts empty when storage is empty', () => {
    const { result } = renderHook(() => useRecentEntities());
    expect(result.current.entities).toEqual([]);
  });

  it('returns the prepopulated list (newest first) on mount', () => {
    const list = [
      { label: 'A', href: '/a', type: 'manuscript', visitedAt: 2 },
      { label: 'B', href: '/b', type: 'scribe', visitedAt: 1 },
    ];
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    const { result } = renderHook(() => useRecentEntities());
    expect(result.current.entities).toEqual(list);
  });

  it('does NOT throw when storage holds malformed JSON — returns []', () => {
    // Regression net for the fix: getSnapshot() used to call JSON.parse
    // unguarded, which would throw on every backoffice render.
    window.localStorage.setItem(STORAGE_KEY, '{not json');
    const { result } = renderHook(() => useRecentEntities());
    expect(result.current.entities).toEqual([]);
  });

  it('does NOT throw when storage holds valid JSON that is not an array', () => {
    // `'null'`, `'{}'`, scalars: parsed cleanly by JSON.parse but the
    // result wasn't an array. Used to flow into `.filter` / `.find`
    // downstream and crash. The Array.isArray guard normalizes to [].
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ foo: 'bar' }));
    const { result } = renderHook(() => useRecentEntities());
    expect(result.current.entities).toEqual([]);
  });

  it('drops malformed entries from a valid array (shape validation)', () => {
    // A list with one good entry and one malformed entry (older format,
    // partial-write corruption). The dashboard called `e.href.startsWith(...)`
    // on the malformed entry and crashed; per-item validation now filters
    // bad entries while keeping the good ones.
    const list = [
      { label: 'Good', href: '/good', type: 'manuscript', visitedAt: 1 },
      { foo: 'bar' }, // missing every required field
      { label: 'Also good', href: '/also', type: 'scribe', visitedAt: 2 },
      { label: 'Number visitedAt please', href: '/x', type: 'graph', visitedAt: 'oops' },
    ];
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    const { result } = renderHook(() => useRecentEntities());
    expect(result.current.entities.map((e) => e.href)).toEqual(['/good', '/also']);
  });

  it('track() prepends an entry with visitedAt', () => {
    const { result } = renderHook(() => useRecentEntities());
    act(() => result.current.track({ label: 'A', href: '/a', type: 'manuscript' }));
    expect(result.current.entities).toHaveLength(1);
    expect(result.current.entities[0]!.label).toBe('A');
    expect(typeof result.current.entities[0]!.visitedAt).toBe('number');
  });

  it('track() dedupes by href, moving the entry to the top', () => {
    const { result } = renderHook(() => useRecentEntities());
    act(() => {
      result.current.track({ label: 'A', href: '/a', type: 'manuscript' });
      result.current.track({ label: 'B', href: '/b', type: 'scribe' });
      result.current.track({ label: 'A2', href: '/a', type: 'manuscript' });
    });
    const hrefs = result.current.entities.map((e) => e.href);
    expect(hrefs).toEqual(['/a', '/b']);
    // The label was updated on the deduped entry, and it's at the top.
    expect(result.current.entities[0]!.label).toBe('A2');
  });

  it('track() caps the list at 15 entries (newest kept)', () => {
    const { result } = renderHook(() => useRecentEntities());
    act(() => {
      for (let i = 0; i < 20; i++) {
        result.current.track({ label: `e${i}`, href: `/e/${i}`, type: 'manuscript' });
      }
    });
    expect(result.current.entities).toHaveLength(15);
    expect(result.current.entities[0]!.href).toBe('/e/19');
    expect(result.current.entities[14]!.href).toBe('/e/5');
  });
});
