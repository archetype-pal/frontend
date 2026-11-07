import { useEffect, useRef, useState } from 'react';

/**
 * True once the page has been hidden for `limitMs`, so a poll can stop asking
 * for a tab nobody is looking at; false again the moment it is shown, when
 * `onShown` runs so the caller can catch up at once rather than at its next tick.
 */
export function useHiddenTooLong(limitMs: number, onShown?: () => void): boolean {
  const [tooLong, setTooLong] = useState(false);
  const shown = useRef(onShown);
  useEffect(() => {
    shown.current = onShown;
  });

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const startCounting = () => {
      clearTimeout(timer);
      timer = setTimeout(() => setTooLong(true), limitMs);
    };
    const onChange = () => {
      if (document.visibilityState === 'hidden') {
        startCounting();
        return;
      }
      clearTimeout(timer);
      setTooLong(false);
      shown.current?.();
    };
    if (document.visibilityState === 'hidden') startCounting();
    document.addEventListener('visibilitychange', onChange);
    return () => {
      document.removeEventListener('visibilitychange', onChange);
      clearTimeout(timer);
    };
  }, [limitMs]);

  return tooLong;
}
