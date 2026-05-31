'use client';

import * as React from 'react';
import { Table, LayoutGrid, BarChart3, Map, PieChart } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ViewMode } from '@/components/search/search-actions-menu';

type ViewSwitcherProps = {
  viewMode: ViewMode;
  setViewMode: React.Dispatch<React.SetStateAction<ViewMode>>;
  showGridToggle: boolean;
  showTimelineToggle: boolean;
  showDistributionToggle: boolean;
  showMapToggle: boolean;
  hasTimelineData: boolean;
  distributionEnabled: boolean;
  className?: string;
};

/**
 * The visible segmented view-switcher in the search sub-header. Surfaces the
 * Table / Grid / Timeline / Map / Charts lenses that previously hid inside the
 * Actions menu, so users actually discover the grid. Availability mirrors the
 * `show*Toggle` flags from `useSearchViewMode`; a view that exists for the type
 * but has no data (e.g. timeline with no date distribution) is shown disabled.
 */
export function ViewSwitcher({
  viewMode,
  setViewMode,
  showGridToggle,
  showTimelineToggle,
  showDistributionToggle,
  showMapToggle,
  hasTimelineData,
  distributionEnabled,
  className,
}: ViewSwitcherProps) {
  const options = (
    [
      { mode: 'table', label: 'Table', Icon: Table, show: true, disabled: false },
      { mode: 'grid', label: 'Grid', Icon: LayoutGrid, show: showGridToggle, disabled: false },
      {
        mode: 'timeline',
        label: 'Timeline',
        Icon: BarChart3,
        show: showTimelineToggle,
        disabled: !hasTimelineData,
      },
      { mode: 'map', label: 'Map', Icon: Map, show: showMapToggle, disabled: false },
      {
        mode: 'distribution',
        label: 'Charts',
        Icon: PieChart,
        show: showDistributionToggle,
        disabled: !distributionEnabled,
      },
    ] as const
  ).filter((option) => option.show);

  // Nothing to switch between (e.g. table-only types) — don't render the control.
  if (options.length <= 1) return null;

  return (
    <div
      role="tablist"
      aria-label="Result view"
      className={cn(
        'items-center gap-0.5 rounded-md border border-border bg-background/60 p-0.5',
        className
      )}
    >
      {options.map(({ mode, label, Icon, disabled }) => {
        const active = viewMode === mode;
        return (
          <button
            key={mode}
            type="button"
            role="tab"
            aria-selected={active}
            aria-label={label}
            title={disabled ? `${label} (no data for this result set)` : label}
            disabled={disabled}
            onClick={() => setViewMode(mode)}
            className={cn(
              'inline-flex h-7 w-7 items-center justify-center rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              disabled
                ? 'cursor-not-allowed text-muted-foreground/30'
                : active
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
