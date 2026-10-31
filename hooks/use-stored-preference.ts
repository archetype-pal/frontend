import { useCallback, useSyncExternalStore } from 'react';

const listeners = new Set<() => void>();
// This tab's choices. They win over storage, which can hold an older value when a write failed.
const memory = new Map<string, string>();

function subscribe(listener: () => void) {
  const onStorage = (event: StorageEvent) => {
    // Another tab chose a value; its stored copy replaces this tab's.
    if (event.key === null) memory.clear();
    else memory.delete(event.key);
    listener();
  };
  listeners.add(listener);
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}

function read(key: string): string | null {
  const chosen = memory.get(key);
  if (chosen !== undefined) return chosen;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string) {
  memory.set(key, value);
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Storage can be full or blocked; the in-memory copy still covers this session.
  }
  listeners.forEach((listener) => listener());
}

/** The `'true'` / `'false'` that `String(boolean)` stores; anything else is `fallback`. */
export function parseBoolean(raw: string | null, fallback: boolean): boolean {
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  return fallback;
}

/**
 * A primitive preference kept in localStorage.
 *
 * Read through useSyncExternalStore: the server render and hydration see
 * `serverValue`, every later mount sees the stored value without an effect.
 * A write survives a blocked or full storage for the rest of the visit, and a
 * change made in another tab is picked up. `parse` must return a primitive:
 * the snapshot is compared with Object.is. Pass stable `parse`/`serialize`
 * functions (module-level or memoised) so the setter's identity is stable too.
 */
export function useStoredPreference<T extends string | number | boolean>(
  key: string,
  parse: (raw: string | null) => T,
  serialize: (value: T) => string,
  serverValue: T
): readonly [T, (next: T) => void] {
  const value = useSyncExternalStore(
    subscribe,
    () => parse(read(key)),
    () => serverValue
  );
  const change = useCallback((next: T) => write(key, serialize(next)), [key, serialize]);
  return [value, change] as const;
}
