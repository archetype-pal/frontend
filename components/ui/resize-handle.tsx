import { cn } from '@/lib/utils';

type ResizeHandleProps = React.HTMLAttributes<HTMLSpanElement> & {
  tabIndex?: number;
  role?: string;
};

/**
 * Bottom-right corner resize grip. Spread the `bindResize` object from
 * `useResizable` onto it. Pins to the bottom-right corner of the nearest
 * positioned ancestor (the panel must carry `data-resizable-panel`). Themed
 * with tokens only.
 */
export function ResizeHandle({ className, ...handleProps }: ResizeHandleProps) {
  return (
    <span
      {...handleProps}
      className={cn(
        // Inset past the panels' rounded-lg (8px) + overflow-hidden corner so
        // the grip is never clipped.
        'absolute bottom-1.5 right-1.5 z-20 h-4 w-4 cursor-nwse-resize touch-none select-none',
        'text-muted-foreground/50 transition-colors hover:text-muted-foreground',
        'focus-visible:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        className
      )}
    >
      <svg viewBox="0 0 16 16" className="h-full w-full" aria-hidden="true">
        <path d="M11 15 L15 11 M6 15 L15 6" stroke="currentColor" strokeWidth="1.5" fill="none" />
      </svg>
    </span>
  );
}
