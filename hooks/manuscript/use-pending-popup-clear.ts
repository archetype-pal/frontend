'use client';

import * as React from 'react';

/**
 * A short debounce for clearing the single-popup state, extracted from
 * manuscript-viewer.tsx (Track D1). Annotorious can fire a deselect immediately
 * before a reselect; scheduling the clear on a 50ms timer (and cancelling it on
 * the next select) avoids the popup flickering closed-then-open. Cleans the
 * timer up on unmount.
 */
export function usePendingPopupClear(onClear: () => void) {
  const timerRef = React.useRef<number | null>(null);
  const onClearRef = React.useRef(onClear);
  React.useEffect(() => {
    onClearRef.current = onClear;
  });

  const cancelPendingPopupClear = React.useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const schedulePopupClear = React.useCallback(() => {
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      onClearRef.current();
    }, 50);
  }, []);

  React.useEffect(
    () => () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
    },
    []
  );

  return { schedulePopupClear, cancelPendingPopupClear };
}
