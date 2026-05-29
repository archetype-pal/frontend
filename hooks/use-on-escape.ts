'use client';

import * as React from 'react';

/**
 * Call `handler` when Escape is pressed, while `active`.
 *
 * Used to give hand-rolled (non-Radix) floating panels the standard
 * dialog convention of closing on Escape. Listens in the capture phase so a
 * panel closes even when focus is inside one of its form controls. Skips
 * events already handled (defaultPrevented) so it doesn't fight a nested
 * widget that consumed Escape first (e.g. a Select closing its menu).
 */
export function useOnEscape(active: boolean, handler: () => void): void {
  const handlerRef = React.useRef(handler);
  // Keep the ref current without re-subscribing the listener on every render.
  React.useEffect(() => {
    handlerRef.current = handler;
  });

  React.useEffect(() => {
    if (!active) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return;
      event.preventDefault();
      handlerRef.current();
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [active]);
}
