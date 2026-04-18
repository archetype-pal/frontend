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

export function useDraggablePosition(initial: DraggablePosition = { x: 0, y: 0 }) {
  const [pos, setPos] = React.useState<DraggablePosition>(initial);
  const dragRef = React.useRef<DragState | null>(null);

  const bindDrag = React.useMemo(
    () => ({
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
