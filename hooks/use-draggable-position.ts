'use client';

import * as React from 'react';

type DraggablePosition = {
  x: number;
  y: number;
};

type DragState = {
  startX: number;
  startY: number;
  baseX: number;
  baseY: number;
};

// Keyboard nudge per arrow press; Shift jumps further. Keeps the drag handle
// usable for keyboard-only users (a pointer drag is otherwise the only way to
// move a popup).
const KEYBOARD_STEP = 12;
const KEYBOARD_STEP_LARGE = 60;

export function useDraggablePosition(initial: DraggablePosition = { x: 0, y: 0 }) {
  const [pos, setPos] = React.useState<DraggablePosition>(initial);
  const dragRef = React.useRef<DragState | null>(null);

  const bindDrag = React.useMemo(
    () => ({
      // Focusable handle with a label so screen readers announce how to move
      // it; arrow keys reposition. No role — the header contains real buttons,
      // and role="button" would nest interactive content.
      tabIndex: 0,
      'aria-label': 'Move panel — use the arrow keys to reposition',
      onPointerDown: (e: React.PointerEvent<HTMLElement>) => {
        dragRef.current = {
          startX: e.clientX,
          startY: e.clientY,
          baseX: pos.x,
          baseY: pos.y,
        };
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      },
      onPointerMove: (e: React.PointerEvent<HTMLElement>) => {
        if (!dragRef.current) return;

        const dx = e.clientX - dragRef.current.startX;
        const dy = e.clientY - dragRef.current.startY;

        setPos({
          x: dragRef.current.baseX + dx,
          y: dragRef.current.baseY + dy,
        });
      },
      onPointerUp: () => {
        dragRef.current = null;
      },
      onKeyDown: (e: React.KeyboardEvent<HTMLElement>) => {
        // Ignore keys originating from nested controls (close button, selects).
        if (e.target !== e.currentTarget) return;
        const step = e.shiftKey ? KEYBOARD_STEP_LARGE : KEYBOARD_STEP;
        let dx = 0;
        let dy = 0;
        switch (e.key) {
          case 'ArrowUp':
            dy = -step;
            break;
          case 'ArrowDown':
            dy = step;
            break;
          case 'ArrowLeft':
            dx = -step;
            break;
          case 'ArrowRight':
            dx = step;
            break;
          default:
            return;
        }
        e.preventDefault();
        setPos((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
      },
    }),
    [pos.x, pos.y]
  );

  const reset = React.useCallback(() => {
    setPos(initial);
  }, [initial]);

  return {
    pos,
    setPos,
    bindDrag,
    reset,
  };
}
