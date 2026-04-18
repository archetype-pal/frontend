import * as React from 'react';

import { useDraggablePosition } from '@/hooks/use-draggable-position';

export type DraggablePopupLayerProps = {
  popupId: string;
  initialX: number;
  initialY: number;
  zIndex: number;
  onActivate: (popupId: string) => void;
  onPositionChange?: (popupId: string, x: number, y: number) => void;
  children: (props: {
    popupTransform: string;
    dragHandleProps: React.HTMLAttributes<HTMLDivElement>;
    zIndex: number;
    onPointerDownCapture: React.PointerEventHandler<HTMLDivElement>;
  }) => React.ReactNode;
};

export function DraggablePopupLayer({
  popupId,
  initialX,
  initialY,
  zIndex,
  onActivate,
  onPositionChange,
  children,
}: DraggablePopupLayerProps) {
  const popupDrag = useDraggablePosition({ x: initialX, y: initialY });
  const lastReportedPositionRef = React.useRef<{ x: number; y: number } | null>(null);

  React.useEffect(() => {
    const next = { x: popupDrag.pos.x, y: popupDrag.pos.y };
    const prev = lastReportedPositionRef.current;

    if (prev && prev.x === next.x && prev.y === next.y) return;

    lastReportedPositionRef.current = next;
    onPositionChange?.(popupId, next.x, next.y);
  }, [popupId, popupDrag.pos.x, popupDrag.pos.y, onPositionChange]);

  return (
    <>
      {children({
        popupTransform: `translate(${popupDrag.pos.x}px, ${popupDrag.pos.y}px)`,
        dragHandleProps: popupDrag.bindDrag,
        zIndex,
        onPointerDownCapture: () => onActivate(popupId),
      })}
    </>
  );
}
