'use client';

import type { ReactNode } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface FloatingPanelProps {
  /** Header title text (or node). */
  title: ReactNode;
  /** Optional leading icon in the header. */
  icon?: ReactNode;
  /** Optional trailing header action (e.g. a "clear" button). */
  action?: ReactNode;
  /** When set, a collapse/expand chevron is shown; collapsed hides the body so
   *  the panel shrinks to its header bar and stops covering the corner. */
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  children: ReactNode;
  className?: string;
}

/**
 * Shared bottom-right floating panel chrome — fixed position, card surface,
 * and a titled header, optionally collapsible to just that header. Used by the
 * search-engine task tracker and the image-upload tray so the two don't carry
 * duplicate copies of the same shell.
 */
export function FloatingPanel({
  title,
  icon,
  action,
  collapsed = false,
  onToggleCollapse,
  children,
  className,
}: FloatingPanelProps) {
  return (
    <div
      className={cn(
        'fixed bottom-4 right-4 z-50 w-[380px] max-h-[50vh] overflow-auto rounded-lg border bg-card shadow-lg',
        className
      )}
    >
      <div className="flex items-center justify-between gap-2 border-b px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          {icon}
          <span className="truncate text-sm font-medium">{title}</span>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {action}
          {onToggleCollapse && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={onToggleCollapse}
              aria-label={collapsed ? 'Expand upload panel' : 'Collapse upload panel'}
              aria-expanded={!collapsed}
            >
              {collapsed ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          )}
        </div>
      </div>
      {!collapsed && children}
    </div>
  );
}
