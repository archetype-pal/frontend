import * as React from 'react';

const STORAGE_KEY = 'search-show-thumbnails';

const listeners = new Set<() => void>();

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) onChange();
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener('storage', onStorage);
  };
}

function getSnapshot(): boolean {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === null) return true;
    return saved === 'true';
  } catch {
    return true;
  }
}

function getServerSnapshot(): boolean {
  return true;
}

// Thumbnail visibility preference in search results (images vs text-only view),
// persisted across sessions via localStorage. Uses useSyncExternalStore to keep
// SSR output stable and avoid cascading renders.
export function useShowThumbnails(): [boolean, (value: boolean) => void] {
  const showThumbnails = React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const change = React.useCallback((next: boolean) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, next ? 'true' : 'false');
    } catch {
      // ignore
    }
    listeners.forEach((listener) => listener());
  }, []);

  return [showThumbnails, change];
}
