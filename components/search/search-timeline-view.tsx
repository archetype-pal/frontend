'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';

type SearchTimelineViewProps = {
  dateDistribution?: Record<string, number>;
  onApplyRange: (min: number, max: number) => void;
};

type Bucket = { year: number; count: number };

function toDecadeBuckets(dist: Record<string, number> = {}): Bucket[] {
  const byDecade = new Map<number, number>();
  for (const [yearText, count] of Object.entries(dist)) {
    const year = Number.parseInt(yearText, 10);
    if (!Number.isFinite(year)) continue;
    const decade = Math.floor(year / 10) * 10;
    byDecade.set(decade, (byDecade.get(decade) ?? 0) + count);
  }
  return Array.from(byDecade.entries())
    .map(([year, count]) => ({ year, count }))
    .sort((a, b) => a.year - b.year);
}

export function SearchTimelineView({ dateDistribution, onApplyRange }: SearchTimelineViewProps) {
  const buckets = React.useMemo(() => toDecadeBuckets(dateDistribution), [dateDistribution]);
  const maxCount = React.useMemo(
    () => buckets.reduce((max, bucket) => Math.max(max, bucket.count), 1),
    [buckets]
  );

  if (buckets.length === 0) {
    return (
      <section className="rounded-lg border bg-white p-6 text-center">
        <h3 className="text-sm font-semibold">Timeline unavailable</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          No date distribution is available for the current result set. Try broadening filters.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-lg border bg-white p-4">
      <h3 className="text-sm font-semibold mb-1">Timeline (by decade)</h3>
      <p className="text-xs text-muted-foreground mb-3">
        Click a decade bar to apply a date range filter for that decade.
      </p>
      <div className="space-y-2">
        {buckets.map((bucket) => (
          <button
            key={bucket.year}
            type="button"
            className="w-full text-left group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
            onClick={() => onApplyRange(bucket.year, bucket.year + 9)}
            aria-label={`Filter results for ${bucket.year}s`}
          >
            <div className="flex items-center gap-3">
              <span className="w-16 text-xs text-muted-foreground shrink-0">{bucket.year}s</span>
              <div className="relative h-6 flex-1 rounded bg-muted/50 overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 bg-primary/70 group-hover:bg-primary transition-colors"
                  style={{ width: `${Math.max(4, (bucket.count / maxCount) * 100)}%` }}
                />
                <span className="absolute inset-0 flex items-center justify-end px-2 text-xs font-medium">
                  {bucket.count}
                </span>
              </div>
              <Button size="sm" variant="ghost" className="h-6 px-2 text-xs">
                Filter
              </Button>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
