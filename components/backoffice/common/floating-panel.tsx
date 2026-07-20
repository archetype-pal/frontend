'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface FloatingPanelProps {
  /** Header title text (or node). */
  title: ReactNode;
  /** Optional leading icon in the header. */
  icon?: ReactNode;
  /** Optional trailing header action (e.g. a "clear" button). */
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

/**
 * Shared bottom-right floating panel chrome — fixed position, card surface,
 * and a titled header. Presentational only: callers own the body. Used by the
 * search-engine task tracker and the image-upload tray so the two don't carry
 * duplicate copies of the same shell.
 */
export function FloatingPanel({ title, icon, action, children, className }: FloatingPanelProps) {
  return (
    <div
      className={cn(
        'fixed bottom-4 right-4 z-50 w-[380px] max-h-[50vh] overflow-auto rounded-lg border bg-card shadow-lg',
        className
      )}
    >
      <div className="flex items-center justify-between border-b px-3 py-2">
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-sm font-medium">{title}</span>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}
