import { useCallback, useState, useSyncExternalStore } from 'react';
import { parsePageSize } from '@/lib/pagination';

const listeners = new Set<() => void>();
// This tab's choices. They win over storage, which can hold an older value when a write failed.
const memory = new Map<string, string>();

function subscribe(listener: () => void) {
  const onStorage = (event: StorageEvent) => {
    // Another tab chose a size; its stored value replaces this tab's copy.
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

/** Rows per page for one table, remembered in this browser; `table` null keeps it for this view only. */
export function usePageSize(table: string | null, fallback: number) {
  const key = `backoffice-page-size:${table}`;
  const [local, setLocal] = useState(fallback);
  const saved = useSyncExternalStore(
    subscribe,
    () => (table ? parsePageSize(read(key), fallback) : fallback),
    () => fallback
  );
  const save = useCallback((size: number) => write(key, String(size)), [key]);
  return table ? ([saved, save] as const) : ([local, setLocal] as const);
}
