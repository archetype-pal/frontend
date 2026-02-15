'use client'

import { useEffect } from 'react'

/**
 * Warns the user before leaving the page when there are unsaved changes.
 *
 * Uses the `beforeunload` event to intercept tab close / browser navigation.
 * For in-app navigation, Next.js App Router does not currently expose a
 * route-leave interception API, so this only covers hard navigations.
 *
 * @param dirty – whether the form has unsaved changes.
 */
export function useUnsavedGuard(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return

    function handler(e: BeforeUnloadEvent) {
      e.preventDefault()
      // Modern browsers ignore custom messages but still show a dialog.
    }

    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [dirty])
}
