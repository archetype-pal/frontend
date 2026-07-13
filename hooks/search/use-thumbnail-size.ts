import * as React from 'react';
import type { ThumbnailSize } from '@/components/search/thumbnail-size-control';

const STORAGE_KEY = 'search-grid-thumbnail-size';

function isThumbnailSize(value: string | null): value is ThumbnailSize {
  return value === 'small' || value === 'medium' || value === 'large';
}

// Grid-thumbnail size preference, persisted across sessions. Defaults to
// 'medium' (the historical grid density) and is hydrated from localStorage in
// an effect to keep SSR output stable.
export function useThumbnailSize(): [ThumbnailSize, (value: ThumbnailSize) => void] {
  const [size, setSize] = React.useState<ThumbnailSize>('medium');

  React.useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- seed locally-owned state from localStorage after mount; deferring to an effect (vs. a lazy useState initializer) is required to avoid an SSR/client hydration mismatch, since `window` is unavailable during server render.
    if (isThumbnailSize(saved)) setSize(saved);
  }, []);

  const change = React.useCallback((next: ThumbnailSize) => {
    setSize(next);
    window.localStorage.setItem(STORAGE_KEY, next);
  }, []);

  return [size, change];
}
