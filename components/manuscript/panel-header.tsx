import * as React from 'react';
import { X } from 'lucide-react';

import { Button } from '@/components/ui/button';

/**
 * Draggable header for the floating viewer panels (Annotations filter, Settings):
 * a drag handle carrying the title plus a close button. The close button stops
 * pointerdown + click propagation so dragging the header never swallows the
 * close click. Not for the allograph gallery dialog — that uses Radix
 * DialogHeader/DialogTitle with its own focus/escape wiring.
 */
export function PanelHeader({
  title,
  onClose,
  closeLabel,
  dragHandleProps,
}: {
  title: string;
  onClose: () => void;
  closeLabel: string;
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
}) {
  return (
    <div
      className="flex cursor-move select-none items-center justify-between border-b px-4 py-3"
      {...dragHandleProps}
    >
      <h3 className="text-base font-semibold">{title}</h3>
      {/* stopPropagation on the button itself so clicking close never starts a
          drag on the header (which captures the pointer to begin dragging). */}
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        type="button"
        aria-label={closeLabel}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
