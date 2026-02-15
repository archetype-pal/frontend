'use client'

import { useCallback } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

/**
 * Shared hook for URL-synced tab navigation.
 *
 * Reads the active tab from `?tab=` search param, falling back to
 * `defaultTab`. On change it pushes a new URL (removing the param
 * when the default tab is selected).
 */
export function useTabNavigation<T extends readonly string[]>(
  tabValues: T,
  defaultTab: T[number]
): { activeTab: string; handleTabChange: (value: string) => void } {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()

  const tabFromUrl = searchParams.get('tab')
  const activeTab =
    tabFromUrl && (tabValues as readonly string[]).includes(tabFromUrl)
      ? tabFromUrl
      : defaultTab

  const handleTabChange = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value === defaultTab) {
        params.delete('tab')
      } else {
        params.set('tab', value)
      }
      const query = params.toString()
      router.push(query ? `${pathname}?${query}` : pathname)
    },
    [pathname, router, searchParams, defaultTab]
  )

  return { activeTab, handleTabChange }
}
