'use client';

import * as React from 'react';

/**
 * Tracks a CSS media query. Returns `false` on the server and first paint, then
 * the real match after mount (so callers must tolerate a one-frame default —
 * used here to gate desktop-only panel sizing without an SSR mismatch).
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mql = window.matchMedia(query);
    const update = () => setMatches(mql.matches);
    update();
    mql.addEventListener('change', update);
    return () => mql.removeEventListener('change', update);
  }, [query]);

  return matches;
}
