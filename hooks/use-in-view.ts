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
  // Guards "observe once, then stop" without listing `inView` in the deps — so
  // flipping the state doesn't re-run (and re-subscribe) the effect.
  const hasFiredRef = React.useRef(false);

  React.useEffect(() => {
    const node = ref.current;
    if (!node || hasFiredRef.current) return;
    if (typeof IntersectionObserver === 'undefined') {
      hasFiredRef.current = true;
      setInView(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          hasFiredRef.current = true;
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [ref, rootMargin]);

  return inView;
}
