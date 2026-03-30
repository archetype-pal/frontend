'use client';

import * as React from 'react';

export type HotkeyDefinition = {
  key: string;
  altKey?: boolean;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  handler: (event: KeyboardEvent) => void;
};

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName.toLowerCase();
  return tag === 'input' || tag === 'textarea' || tag === 'select';
}

export function useHotkeys(definitions: HotkeyDefinition[]) {
  const defsRef = React.useRef(definitions);
  React.useEffect(() => {
    defsRef.current = definitions;
  }, [definitions]);

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const targetIsEditable = isEditableTarget(event.target);
      for (const def of defsRef.current) {
        if (event.key.toLowerCase() !== def.key.toLowerCase()) continue;
        if ((def.altKey ?? false) !== event.altKey) continue;
        if ((def.ctrlKey ?? false) !== event.ctrlKey) continue;
        if ((def.metaKey ?? false) !== event.metaKey) continue;
        if ((def.shiftKey ?? false) !== event.shiftKey) continue;
        if (targetIsEditable && !(def.key === 'Escape' || (def.metaKey && def.key === 'k'))) {
          continue;
        }
        def.handler(event);
        break;
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
}
