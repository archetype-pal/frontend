'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

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
  const t = useTranslations('manuscript');

  // Curated to mirror the viewer hotkeys (manuscript-viewer.tsx `viewerHotkeys`)
  // and the tool rail (viewer-toolbar.tsx). Keep in sync when adding a shortcut.
  const navigate = {
    title: t('shortcuts.navigateGroup'),
    shortcuts: [
      { keys: ['G', 'Space'], label: t('shortcuts.panSelect') },
      { keys: ['Z', '+'], label: t('shortcuts.zoomIn') },
      { keys: ['−'], label: t('shortcuts.zoomOut') },
      { keys: ['Shift', '↑ ↓ ← →'], label: t('shortcuts.nudge') },
      { keys: ['Home'], label: t('shortcuts.resetView') },
      { keys: ['F'], label: t('shortcuts.fullScreen') },
    ],
  };

  const annotate = {
    title: t('shortcuts.annotateGroup'),
    shortcuts: [
      { keys: ['D', 'Space'], label: t('shortcuts.drawRegion') },
      { keys: ['M'], label: t('shortcuts.modifyReshape') },
      { keys: ['E'], label: t('shortcuts.editorial') },
      { keys: ['X', 'Delete'], label: t('shortcuts.deleteSelection') },
      { keys: ['S'], label: t('shortcuts.saveChanges') },
    ],
  };

  const groups = showEditingShortcuts ? [navigate, annotate] : [navigate];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('shortcuts.title')}</DialogTitle>
          <DialogDescription>{t('shortcuts.description')}</DialogDescription>
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
