'use client';

import { useEffect, useState } from 'react';
import {
  Building2,
  FileText,
  CalendarRange,
  ChevronDown,
  ChevronUp,
  Compass,
  type LucideIcon,
} from 'lucide-react';
import type { FacetData } from '@/types/facets';
import type { ResultType } from '@/lib/search-types';
import { resolveResultTypeLabel } from '@/lib/search-label-helpers';
import { useModelLabels } from '@/contexts/model-labels-context';
import { cn } from '@/lib/utils';

const LANDING_PREF_KEY = 'search-landing-pref';

type SearchLandingProps = {
  totalCount: number;
  typeLabel: string;
  enabledTypes: ResultType[];
  countsByType: Partial<Record<ResultType, number>>;
  facets: FacetData;
  /** date_min → count, used to build meaningful period buckets. */
  dateDistribution?: Record<string, number>;
  /**
   * Default collapsed state when the user hasn't expressed a preference. The
   * page passes `true` for the (researcher-oriented) table view so it starts
   * clean, and `false` for the grid/browse view.
   */
  autoCollapsed?: boolean;
  onSelectFacet: (facetKey: string, value: string) => void;
  onApplyDateRange: (min: number, max: number) => void;
  className?: string;
};

// Ignore placeholder/degenerate dates (the data carries date_min=0 for records
// with unknown dates, which would otherwise dominate the period browse).
const MIN_PLAUSIBLE_YEAR = 1000;

function topItems(facets: FacetData, key: string, n: number) {
  const value = facets[key];
  if (!value || value.kind !== 'list') return [];
  return [...value.items].sort((a, b) => b.count - a.count).slice(0, n);
}

function datedYears(dateDistribution?: Record<string, number>): Array<[number, number]> {
  if (!dateDistribution) return [];
  return Object.entries(dateDistribution)
    .map(([year, count]) => [Number.parseInt(year, 10), count] as [number, number])
    .filter(([year, count]) => Number.isFinite(year) && year >= MIN_PLAUSIBLE_YEAR && count > 0);
}

function periodBuckets(
  years: Array<[number, number]>
): Array<{ label: string; min: number; max: number }> {
  if (years.length === 0) return [];
  const minYear = Math.min(...years.map(([year]) => year));
  const maxYear = Math.max(...years.map(([year]) => year));
  const buckets: Array<{ label: string; min: number; max: number }> = [];
  // Half-century buckets, but only those that actually contain records.
  for (let start = Math.floor(minYear / 50) * 50; start <= maxYear; start += 50) {
    const lo = start;
    const hi = start + 49;
    const count = years.reduce((sum, [year, c]) => (year >= lo && year <= hi ? sum + c : sum), 0);
    if (count > 0) buckets.push({ label: `${lo}–${hi}`, min: lo, max: hi });
  }
  return buckets;
}

/**
 * Persisted show/hide preference for the landing. `null` means the user hasn't
 * chosen, so the caller falls back to its auto default. Lives in a hook so the
 * mount-time localStorage read isn't a set-state-in-effect lint violation.
 */
function useLandingPref(): ['shown' | 'hidden' | null, (next: 'shown' | 'hidden') => void] {
  const [pref, setPref] = useState<'shown' | 'hidden' | null>(null);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(LANDING_PREF_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time hydration-safe load
      if (raw === 'shown' || raw === 'hidden') setPref(raw);
    } catch {
      // ignore
    }
  }, []);

  const setPreference = (next: 'shown' | 'hidden') => {
    setPref(next);
    try {
      window.localStorage.setItem(LANDING_PREF_KEY, next);
    } catch {
      // ignore
    }
  };

  return [pref, setPreference];
}

type Chip = { label: string; count?: number; onClick: () => void };

function ChipGroup({
  icon: Icon,
  title,
  chips,
}: {
  icon: LucideIcon;
  title: string;
  chips: Chip[];
}) {
  if (chips.length === 0) return null;
  return (
    <div>
      <h3 className="mb-2 flex items-center gap-1.5 font-serif text-sm font-semibold text-foreground">
        <Icon className="h-4 w-4 text-muted-foreground" />
        {title}
      </h3>
      <div className="flex flex-wrap gap-1.5">
        {chips.map((chip, idx) => (
          <button
            key={`${chip.label}-${idx}`}
            type="button"
            onClick={chip.onClick}
            className="group inline-flex items-center gap-1.5 rounded-full border border-border bg-background/60 px-2.5 py-1 text-xs text-foreground transition-colors hover:border-accent/50 hover:bg-accent/10"
          >
            <span className="max-w-[12rem] truncate">{chip.label}</span>
            {typeof chip.count === 'number' && (
              <span className="tabular-nums text-muted-foreground group-hover:text-foreground">
                {chip.count.toLocaleString()}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * Zero-query browse landing. Shown above the results when no keyword and no
 * filters are active, so arriving at /search offers a guided way in (corpus
 * summary + browse-by chips) instead of dropping the visitor straight into a
 * raw table of everything. Each chip seeds a filtered search.
 *
 * Collapsible, with the choice persisted: researchers who want a clean table
 * collapse it once and it stays collapsed; by default it starts collapsed in
 * the table view and expanded in the (exploratory) grid view.
 */
export function SearchLanding({
  totalCount,
  typeLabel,
  enabledTypes,
  countsByType,
  facets,
  dateDistribution,
  autoCollapsed = false,
  onSelectFacet,
  onApplyDateRange,
  className,
}: SearchLandingProps) {
  const { getLabel } = useModelLabels();
  // null = no explicit choice yet → follow `autoCollapsed`.
  const [pref, setPreference] = useLandingPref();

  const collapsed = pref ? pref === 'hidden' : autoCollapsed;

  if (collapsed) {
    return (
      <div
        className={cn(
          'flex items-center justify-between gap-2 rounded-xl border border-border/80 bg-card px-4 py-2 shadow-sm',
          className
        )}
      >
        <span className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          <Compass className="h-3.5 w-3.5" />
          Browse the archive
        </span>
        <button
          type="button"
          onClick={() => setPreference('shown')}
          className="inline-flex items-center gap-1 rounded text-xs text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
        >
          Show
          <ChevronDown className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  const repositories = topItems(facets, 'repository_name', 8);
  const docTypes = topItems(facets, 'type', 8);
  const years = datedYears(dateDistribution);
  const periods = periodBuckets(years);
  const dateRange: [number, number] | null =
    years.length > 0
      ? [Math.min(...years.map(([year]) => year)), Math.max(...years.map(([year]) => year))]
      : null;

  const summaryParts = enabledTypes
    .map((type) =>
      typeof countsByType[type] === 'number'
        ? `${countsByType[type]!.toLocaleString()} ${resolveResultTypeLabel(type, getLabel).toLowerCase()}`
        : null
    )
    .filter((part): part is string => part != null)
    .slice(0, 4);

  return (
    <section
      className={cn(
        'relative animate-[search-rise_0.4s_ease-out] rounded-xl border border-border/80 bg-card p-5 shadow-sm sm:p-6',
        className
      )}
      aria-label="Browse the archive"
    >
      <button
        type="button"
        onClick={() => setPreference('hidden')}
        className="absolute right-3 top-3 inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="Hide the browse panel"
      >
        Hide
        <ChevronUp className="h-3.5 w-3.5" />
      </button>
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        Browse the archive
      </p>
      <h2 className="mt-1 font-display text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
        {totalCount.toLocaleString()} {typeLabel.toLowerCase()} to explore
      </h2>
      {(summaryParts.length > 0 || dateRange) && (
        <p className="mt-1.5 text-sm text-muted-foreground">
          {summaryParts.join(' · ')}
          {dateRange
            ? `${summaryParts.length > 0 ? ' · ' : ''}${dateRange[0]}–${dateRange[1]}`
            : ''}
        </p>
      )}
      <div className="ornament-divider mt-4 text-border" aria-hidden />

      <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <ChipGroup
          icon={Building2}
          title="Repositories"
          chips={repositories.map((item) => ({
            label: item.label,
            count: item.count,
            onClick: () => onSelectFacet('repository_name', item.value),
          }))}
        />
        <ChipGroup
          icon={FileText}
          title="Document types"
          chips={docTypes.map((item) => ({
            label: item.label,
            count: item.count,
            onClick: () => onSelectFacet('type', item.value),
          }))}
        />
        <ChipGroup
          icon={CalendarRange}
          title="By period"
          chips={periods.map((period) => ({
            label: period.label,
            onClick: () => onApplyDateRange(period.min, period.max),
          }))}
        />
      </div>
    </section>
  );
}
