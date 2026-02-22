'use client';

import { CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface CompletenessItem {
  /** Human-readable label, e.g. "Date" */
  label: string;
  /** Whether the field is populated */
  complete: boolean;
  /** Current value to display when complete, e.g. "s.xi" */
  value?: string;
  /** Called when the user clicks a missing item (e.g. to scroll to that section) */
  onNavigate?: () => void;
}

interface CompletenessChecklistProps {
  items: CompletenessItem[];
  className?: string;
}

/**
 * A compact horizontal/vertical checklist showing which fields are populated
 * and which are missing. Professors can click missing items to navigate
 * to the relevant form section.
 *
 * Usage:
 * ```tsx
 * <CompletenessChecklist
 *   items={[
 *     { label: 'Date', complete: true, value: 's.xi' },
 *     { label: 'Format', complete: false, onNavigate: () => scrollToFormat() },
 *     { label: 'Catalogue #', complete: true, value: '2 entries' },
 *   ]}
 * />
 * ```
 */
export function CompletenessChecklist({ items, className }: CompletenessChecklistProps) {
  const total = items.length;
  const done = items.filter((i) => i.complete).length;

  return (
    <div className={cn('flex flex-wrap items-center gap-x-4 gap-y-1', className)}>
      <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {done}/{total} fields
      </span>
      {items.map((item) => {
        const Wrapper = item.onNavigate && !item.complete ? 'button' : 'span';
        return (
          <Wrapper
            key={item.label}
            className={cn(
              'inline-flex items-center gap-1 text-xs',
              item.complete ? 'text-muted-foreground' : 'text-amber-600 dark:text-amber-400',
              !item.complete && item.onNavigate && 'cursor-pointer hover:underline'
            )}
            {...(!item.complete && item.onNavigate
              ? { onClick: item.onNavigate, type: 'button' as const }
              : {})}
          >
            {item.complete ? (
              <CheckCircle2 className="h-3 w-3 text-green-500 shrink-0" />
            ) : (
              <AlertCircle className="h-3 w-3 shrink-0" />
            )}
            <span>
              {item.label}
              {item.complete && item.value && (
                <span className="text-muted-foreground ml-1">({item.value})</span>
              )}
              {!item.complete && <span className="text-muted-foreground ml-1">missing</span>}
            </span>
          </Wrapper>
        );
      })}
    </div>
  );
}
