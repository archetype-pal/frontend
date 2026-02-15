'use client'

import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface Shortcut {
  keys: string[]
  description: string
}

const shortcuts: { group: string; items: Shortcut[] }[] = [
  {
    group: 'Navigation',
    items: [
      { keys: ['Ctrl', 'K'], description: 'Open command palette' },
      { keys: ['?'], description: 'Show this help dialog' },
    ],
  },
  {
    group: 'Editing',
    items: [
      { keys: ['Ctrl', 'S'], description: 'Save current form' },
      { keys: ['Escape'], description: 'Close dialog / discard changes' },
    ],
  },
]

/**
 * A help dialog that lists all keyboard shortcuts.
 * Opens when the user presses "?" while not focused on an input.
 *
 * This component is rendered once in the backoffice shell and
 * listens globally for the "?" key.
 */
export function KeyboardShortcutsDialog() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      // Only trigger on "?" when not in an input/textarea/contenteditable
      const target = e.target as HTMLElement
      const isInput =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      if (e.key === '?' && !isInput && !e.ctrlKey && !e.metaKey) {
        e.preventDefault()
        setOpen(true)
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className='max-w-sm'>
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
        </DialogHeader>
        <div className='space-y-5 mt-2'>
          {shortcuts.map((group) => (
            <div key={group.group}>
              <h3 className='text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2'>
                {group.group}
              </h3>
              <div className='space-y-2'>
                {group.items.map((shortcut) => (
                  <div
                    key={shortcut.description}
                    className='flex items-center justify-between text-sm'
                  >
                    <span className='text-muted-foreground'>
                      {shortcut.description}
                    </span>
                    <div className='flex items-center gap-1'>
                      {shortcut.keys.map((key) => (
                        <kbd
                          key={key}
                          className='inline-flex h-5 min-w-5 items-center justify-center rounded border bg-muted px-1.5 text-[10px] font-medium text-muted-foreground'
                        >
                          {key}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <p className='text-[10px] text-muted-foreground mt-3'>
          Press <kbd className='rounded border bg-muted px-1 text-[10px]'>?</kbd> anytime to show this dialog.
        </p>
      </DialogContent>
    </Dialog>
  )
}
