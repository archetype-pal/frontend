'use client';

import { useCallback, useSyncExternalStore } from 'react';

export interface RecentEntity {
  label: string;
  href: string;
  type: string;
  visitedAt: number;
}

const STORAGE_KEY = 'backoffice:recent-entities';
const MAX_ENTRIES = 15;

let listeners: Array<() => void> = [];

// Cache the snapshot to avoid creating new array references on every call.
// useSyncExternalStore compares by reference, so returning a new array each
// time causes infinite re-renders.
let cachedRaw: string | null = null;
let cachedSnapshot: RecentEntity[] = [];
const EMPTY: RecentEntity[] = [];

function emitChange() {
  // Invalidate cached snapshot so getSnapshot re-reads localStorage
  cachedRaw = null;
  for (const listener of listeners) listener();
}

function isValidRecentEntity(value: unknown): value is RecentEntity {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const v = value as Partial<RecentEntity>;
  return (
    typeof v.label === 'string' &&
    typeof v.href === 'string' &&
    typeof v.type === 'string' &&
    typeof v.visitedAt === 'number'
  );
}

function readFromStorage(): RecentEntity[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    // Guard against `'null'`, scalars, or `'{...}'` in storage — older
    // clients or hand-edited values that would otherwise crash every
    // downstream `.filter` / `.find` on the result. Per-item validation
    // protects `e.href.startsWith(...)` calls in the dashboard from
    // partially-malformed entries inside an otherwise-valid array.
    return Array.isArray(parsed) ? parsed.filter(isValidRecentEntity) : [];
  } catch {
    return [];
  }
}

function getSnapshot(): RecentEntity[] {
  if (typeof window === 'undefined') return EMPTY;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw === cachedRaw) return cachedSnapshot;
  cachedRaw = raw;
  // Guard against corrupted / manually-edited localStorage. Without this,
  // a malformed value would throw on every backoffice render via
  // useSyncExternalStore.
  try {
    if (!raw) {
      cachedSnapshot = [];
    } else {
      const parsed = JSON.parse(raw);
      cachedSnapshot = Array.isArray(parsed) ? parsed.filter(isValidRecentEntity) : [];
    }
  } catch {
    cachedSnapshot = [];
  }
  return cachedSnapshot;
}

function getServerSnapshot(): RecentEntity[] {
  return EMPTY;
}

function subscribe(listener: () => void) {
  listeners = [...listeners, listener];
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

/**
 * Track and retrieve recently visited backoffice entities.
 */
export function useRecentEntities() {
  const entities = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const track = useCallback((entity: Omit<RecentEntity, 'visitedAt'>) => {
    try {
      const current = readFromStorage();
      const filtered = current.filter((e) => e.href !== entity.href);
      const next = [{ ...entity, visitedAt: Date.now() }, ...filtered].slice(0, MAX_ENTRIES);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      emitChange();
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  return { entities, track };
}
