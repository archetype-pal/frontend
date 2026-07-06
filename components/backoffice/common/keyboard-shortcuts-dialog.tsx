'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface Shortcut {
  keys: string[];
  description: string;
}

/**
 * A help dialog that lists all keyboard shortcuts.
 * Opens when the user presses "?" while not focused on an input.
 *
 * This component is rendered once in the backoffice shell and
 * listens globally for the "?" key.
 */
export function KeyboardShortcutsDialog() {
  const [open, setOpen] = useState(false);
  const t = useTranslations('backoffice');

  const shortcuts: { group: string; items: Shortcut[] }[] = [
    {
      group: t('keyboardShortcuts.groupNavigation'),
      items: [
        { keys: ['Ctrl', 'K'], description: t('keyboardShortcuts.openCommandPalette') },
        { keys: ['?'], description: t('keyboardShortcuts.showHelpDialog') },
      ],
    },
    {
      group: t('keyboardShortcuts.groupEditing'),
      items: [
        { keys: ['Ctrl', 'S'], description: t('keyboardShortcuts.saveCurrentForm') },
        { keys: ['Escape'], description: t('keyboardShortcuts.closeDialog') },
      ],
    },
  ];

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      // Only trigger on "?" when not in an input/textarea/contenteditable
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
      if (e.key === '?' && !isInput && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setOpen(true);
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t('keyboardShortcuts.title')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-5 mt-2">
          {shortcuts.map((group) => (
            <div key={group.group}>
              <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
                {group.group}
              </h3>
              <div className="space-y-2">
                {group.items.map((shortcut) => (
                  <div
                    key={shortcut.description}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-muted-foreground">{shortcut.description}</span>
                    <div className="flex items-center gap-1">
                      {shortcut.keys.map((key) => (
                        <kbd
                          key={key}
                          className="inline-flex h-5 min-w-5 items-center justify-center rounded border bg-muted px-1.5 text-[10px] font-medium text-muted-foreground"
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
        <p className="text-[10px] text-muted-foreground mt-3">
          {t('keyboardShortcuts.pressToShow', { key: '?' })}
        </p>
      </DialogContent>
    </Dialog>
  );
}
