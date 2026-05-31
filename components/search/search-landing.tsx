'use client';

import { Building2, FileText, CalendarRange, type LucideIcon } from 'lucide-react';
import type { FacetData } from '@/types/facets';
import type { ResultType } from '@/lib/search-types';
import { resolveResultTypeLabel } from '@/lib/search-label-helpers';
import { useModelLabels } from '@/contexts/model-labels-context';
import { cn } from '@/lib/utils';

type SearchLandingProps = {
  totalCount: number;
  typeLabel: string;
  enabledTypes: ResultType[];
  countsByType: Partial<Record<ResultType, number>>;
  facets: FacetData;
  /** date_min → count, used to build meaningful period buckets. */
  dateDistribution?: Record<string, number>;
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
 */
export function SearchLanding({
  totalCount,
  typeLabel,
  enabledTypes,
  countsByType,
  facets,
  dateDistribution,
  onSelectFacet,
  onApplyDateRange,
  className,
}: SearchLandingProps) {
  const { getLabel } = useModelLabels();
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
        'animate-[search-rise_0.4s_ease-out] rounded-xl border border-border/80 bg-card p-5 shadow-sm sm:p-6',
        className
      )}
      aria-label="Browse the archive"
    >
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
