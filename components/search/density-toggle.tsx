'use client';

import { Rows3, Table2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ResultDensity } from '@/hooks/search/use-search-view-mode';

type DensityToggleProps = {
  density: ResultDensity;
  setDensity: (density: ResultDensity) => void;
  className?: string;
};

/**
 * Switches the list (table) view between identity-first media rows
 * (`comfortable`) and the dense spreadsheet (`compact`). Only meaningful for the
 * table view, so the page renders it solely there.
 */
export function DensityToggle({ density, setDensity, className }: DensityToggleProps) {
  const options = [
    { value: 'comfortable' as const, label: 'Comfortable', Icon: Rows3 },
    { value: 'compact' as const, label: 'Compact', Icon: Table2 },
  ];

  return (
    <div
      role="group"
      aria-label="Row density"
      className={cn(
        'items-center gap-0.5 rounded-md border border-border bg-background/60 p-0.5',
        className
      )}
    >
      {options.map(({ value, label, Icon }) => {
        const active = density === value;
        return (
          <button
            key={value}
            type="button"
            aria-pressed={active}
            aria-label={label}
            title={`${label} rows`}
            onClick={() => setDensity(value)}
            className={cn(
              'inline-flex h-7 w-7 items-center justify-center rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              active
                ? 'bg-card text-primary shadow-sm'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            <Icon className="h-4 w-4" />
          </button>
        );
      })}
    </div>
  );
}
