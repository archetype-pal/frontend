import { useCallback, useState, useSyncExternalStore } from 'react';
import { parsePageSize } from '@/lib/pagination';

const listeners = new Set<() => void>();
const memory = new Map<string, string>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener('storage', listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', listener);
  };
}

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key) ?? memory.get(key) ?? null;
  } catch {
    return memory.get(key) ?? null;
  }
}

function write(key: string, value: string) {
  memory.set(key, value);
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Storage can be blocked; the in-memory copy still covers this session.
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
