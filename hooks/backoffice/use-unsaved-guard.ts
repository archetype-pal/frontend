'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Warns the user before leaving the page when there are unsaved changes.
 *
 * Intercepts both:
 * - Browser/tab navigation via `beforeunload`
 * - Next.js client-side navigation via `window.onbeforeunload` confirmation
 *   and history/popstate interception
 *
 * @param dirty – whether the form has unsaved changes.
 */
export function useUnsavedGuard(dirty: boolean) {
  const router = useRouter()

  useEffect(() => {
    if (!dirty) return

    function handler(e: BeforeUnloadEvent) {
      e.preventDefault()
    }

    window.addEventListener('beforeunload', handler)

    // Intercept back/forward browser navigation
    function onPopState(e: PopStateEvent) {
      if (dirty) {
        const leave = window.confirm(
          'You have unsaved changes. Are you sure you want to leave?'
        )
        if (!leave) {
          e.preventDefault()
          // Push current state back to prevent navigation
          window.history.pushState(null, '', window.location.href)
        }
      }
    }

    // Push a duplicate state so popstate fires before actually leaving
    window.history.pushState(null, '', window.location.href)
    window.addEventListener('popstate', onPopState)

    // Intercept link clicks within the page that use Next.js navigation
    function onClickCapture(e: MouseEvent) {
      const anchor = (e.target as HTMLElement).closest('a')
      if (!anchor) return

      const href = anchor.getAttribute('href')
      if (!href || href.startsWith('http') || href.startsWith('#')) return

      // Only intercept internal navigations
      if (
        !window.confirm(
          'You have unsaved changes. Are you sure you want to leave?'
        )
      ) {
        e.preventDefault()
        e.stopPropagation()
      }
    }

    document.addEventListener('click', onClickCapture, true)

    return () => {
      window.removeEventListener('beforeunload', handler)
      window.removeEventListener('popstate', onPopState)
      document.removeEventListener('click', onClickCapture, true)
    }
  }, [dirty, router])
}
