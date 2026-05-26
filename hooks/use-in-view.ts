'use client';

import * as React from 'react';

/**
 * Tracks whether an element has entered the viewport. Once true it stays true
 * (the observer disconnects), so consumers can lazily mount expensive content
 * the first time it scrolls into view without it unmounting again.
 */
export function useInView<T extends Element>(
  ref: React.RefObject<T | null>,
  rootMargin = '300px'
): boolean {
  const [inView, setInView] = React.useState(false);

  React.useEffect(() => {
    const node = ref.current;
    if (!node || inView) return;
    if (typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [ref, inView, rootMargin]);

  return inView;
}
