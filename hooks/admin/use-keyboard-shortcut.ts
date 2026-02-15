'use client'

import { useEffect, useRef } from 'react'

type ShortcutHandler = (e: KeyboardEvent) => void

/**
 * Register a keyboard shortcut that fires the handler when the key combo is pressed.
 *
 * @param combo – e.g. 'mod+s', 'mod+backspace', 'escape'
 *   `mod` is Cmd on macOS and Ctrl on Windows/Linux.
 * @param handler – callback. Return value is ignored.
 * @param enabled – disable without removing the hook.
 */
export function useKeyboardShortcut(
  combo: string,
  handler: ShortcutHandler,
  enabled = true
) {
  const handlerRef = useRef(handler)
  handlerRef.current = handler

  useEffect(() => {
    if (!enabled) return

    const parts = combo.toLowerCase().split('+').map((p) => p.trim())
    const needMod = parts.includes('mod')
    const needShift = parts.includes('shift')
    const needAlt = parts.includes('alt')
    const key = parts.filter(
      (p) => p !== 'mod' && p !== 'shift' && p !== 'alt'
    )[0]

    function onKeyDown(e: KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey
      if (needMod && !mod) return
      if (needShift && !e.shiftKey) return
      if (needAlt && !e.altKey) return

      // Match the key
      const eventKey = e.key.toLowerCase()
      const matched =
        eventKey === key ||
        (key === 'backspace' && eventKey === 'backspace') ||
        (key === 'escape' && eventKey === 'escape') ||
        (key === 'enter' && eventKey === 'enter')

      if (matched) {
        e.preventDefault()
        handlerRef.current(e)
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [combo, enabled])
}
