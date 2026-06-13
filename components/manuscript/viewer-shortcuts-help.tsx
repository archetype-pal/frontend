'use client';

import * as React from 'react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

type Shortcut = { keys: string[]; label: string };
type ShortcutGroup = { title: string; shortcuts: Shortcut[] };

// Curated to mirror the viewer hotkeys (manuscript-viewer.tsx `viewerHotkeys`)
// and the tool rail (viewer-toolbar.tsx). Keep in sync when adding a shortcut.
const NAVIGATE: ShortcutGroup = {
  title: 'Navigate the image',
  shortcuts: [
    { keys: ['G', 'Space'], label: 'Pan / select' },
    { keys: ['Z', '+'], label: 'Zoom in' },
    { keys: ['−'], label: 'Zoom out' },
    { keys: ['Shift', '↑ ↓ ← →'], label: 'Nudge the image' },
    { keys: ['Home'], label: 'Reset the view' },
    { keys: ['F'], label: 'Full screen' },
  ],
};

const ANNOTATE: ShortcutGroup = {
  title: 'Annotate',
  shortcuts: [
    { keys: ['D', 'Space'], label: 'Draw a region' },
    { keys: ['M'], label: 'Modify / reshape' },
    { keys: ['E'], label: 'Editorial annotation' },
    { keys: ['X', 'Delete'], label: 'Delete selection' },
    { keys: ['S'], label: 'Save changes' },
  ],
};

function Key({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded border border-border bg-muted px-1.5 font-sans text-xs font-medium text-foreground shadow-sm">
      {children}
    </kbd>
  );
}

/**
 * Read-only reference of the viewer's keyboard shortcuts, opened from the tool
 * rail's "?" button (or the ? key). The Annotate group is shown only to users
 * who can edit; everyone gets the navigation shortcuts.
 */
export function ViewerShortcutsHelp({
  open,
  onOpenChange,
  showEditingShortcuts,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  showEditingShortcuts: boolean;
}) {
  const groups = showEditingShortcuts ? [NAVIGATE, ANNOTATE] : [NAVIGATE];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
          <DialogDescription>Move around and work the image faster.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-x-8 gap-y-6 px-5 pb-5 pt-4 sm:grid-cols-2">
          {groups.map((group) => (
            <section key={group.title} className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {group.title}
              </h3>
              <ul className="space-y-1.5">
                {group.shortcuts.map((shortcut) => (
                  <li
                    key={shortcut.label}
                    className="flex items-center justify-between gap-3 text-sm"
                  >
                    <span className="text-foreground">{shortcut.label}</span>
                    <span className="flex shrink-0 items-center gap-1">
                      {shortcut.keys.map((key) => (
                        <Key key={key}>{key}</Key>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
