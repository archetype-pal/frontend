'use client';

import * as React from 'react';

export type HotkeyDefinition = {
  key: string;
  altKey?: boolean;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  /** When true, the hotkey fires even if the focused element is an input,
   * textarea, contenteditable, or select. Default false. Use sparingly —
   * mostly for global commit shortcuts like Cmd+S, Cmd+Enter, Cmd+K, or
   * Escape that should escape from form fields. */
  allowInEditable?: boolean;
  handler: (event: KeyboardEvent) => void;
};

// Whether a keyboard event target is "user is typing" — an input,
// textarea, contenteditable, or select. Used both by useHotkeys (to
// gate global shortcuts) and by per-component keyboard handlers that
// need to skip when focus is in a form field.
export function isEditableTarget(target: EventTarget | null): boolean {
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
        if (targetIsEditable && !def.allowInEditable) continue;
        def.handler(event);
        break;
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
}
