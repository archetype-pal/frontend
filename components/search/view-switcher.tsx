'use client';

'use client';

import * as React from 'react';
import { Table, LayoutGrid, BarChart3, Map, PieChart } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ViewMode } from '@/components/search/search-actions-menu';
import { useTranslations } from 'next-intl';

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
  const t = useTranslations('search');
  const options = (
    [
      { mode: 'table', label: t('viewTable'), Icon: Table, show: true, disabled: false },
      {
        mode: 'grid',
        label: t('viewGrid'),
        Icon: LayoutGrid,
        show: showGridToggle,
        disabled: false,
      },
      {
        mode: 'timeline',
        label: t('viewTimeline'),
        Icon: BarChart3,
        show: showTimelineToggle,
        disabled: !hasTimelineData,
      },
      { mode: 'map', label: t('viewMap'), Icon: Map, show: showMapToggle, disabled: false },
      {
        mode: 'distribution',
        label: t('viewCharts'),
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
      aria-label={t('resultTypeLabel')}
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
            title={disabled ? t('viewDisabled', { label }) : label}
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
