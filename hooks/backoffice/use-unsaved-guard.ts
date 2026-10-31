'use client';

import { useEffect } from 'react';

/**
 * Warns before leaving a page with unsaved changes: the browser's own
 * beforeunload prompt for reloads and closed tabs, and a confirm() for
 * back/forward (via a pushed duplicate history entry) and in-page link clicks.
 */
export function useUnsavedGuard(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return;

    function handler(e: BeforeUnloadEvent) {
      // Modern Chrome/Firefox honor preventDefault() alone, but Safari and
      // Chrome <120 still require setting `returnValue` to actually surface
      // the leave-page dialog. Set both so the guard works cross-browser
      // and unsaved publication/manuscript edits aren't silently lost.
      e.preventDefault();
      e.returnValue = '';
    }

    window.addEventListener('beforeunload', handler);

    // Intercept back/forward browser navigation
    function onPopState(e: PopStateEvent) {
      if (dirty) {
        const leave = window.confirm('You have unsaved changes. Are you sure you want to leave?');
        if (!leave) {
          e.preventDefault();
          // Push current state back to prevent navigation
          window.history.pushState(null, '', window.location.href);
        }
      }
    }

    // Push a duplicate state so popstate fires before actually leaving
    window.history.pushState(null, '', window.location.href);
    window.addEventListener('popstate', onPopState);

    // Intercept link clicks within the page that use Next.js navigation
    function onClickCapture(e: MouseEvent) {
      const anchor = (e.target as HTMLElement).closest('a');
      if (!anchor) return;

      const href = anchor.getAttribute('href');
      if (!href || href.startsWith('http') || href.startsWith('#')) return;

      // Only intercept internal navigations
      if (!window.confirm('You have unsaved changes. Are you sure you want to leave?')) {
        e.preventDefault();
        e.stopPropagation();
      }
    }

    document.addEventListener('click', onClickCapture, true);

    return () => {
      window.removeEventListener('beforeunload', handler);
      window.removeEventListener('popstate', onPopState);
      document.removeEventListener('click', onClickCapture, true);
    };
  }, [dirty]);
}
