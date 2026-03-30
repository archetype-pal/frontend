'use client';

import * as React from 'react';

type Distribution = Record<string, number> | undefined;

type SearchDistributionPanelProps = {
  byDate?: Distribution;
  byRepository?: Distribution;
  byHand?: Distribution;
  byComponentFeature?: Distribution;
  isLoading?: boolean;
  errorMessage?: string | null;
};

function topEntries(input: Distribution, limit: number): Array<[string, number]> {
  if (!input) return [];
  return Object.entries(input)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);
}

function DistributionBlock({
  title,
  data,
  limit = 8,
}: {
  title: string;
  data: Distribution;
  limit?: number;
}) {
  const entries = React.useMemo(() => topEntries(data, limit), [data, limit]);
  const max = entries[0]?.[1] ?? 1;
  return (
    <section className="rounded border p-3">
      <h4 className="text-xs font-semibold mb-2">{title}</h4>
      {entries.length === 0 ? (
        <p className="text-xs text-muted-foreground">No data.</p>
      ) : (
        <ul className="space-y-1.5">
          {entries.map(([label, count]) => (
            <li key={label} className="space-y-1">
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="truncate">{label}</span>
                <span className="text-muted-foreground">{count}</span>
              </div>
              <div className="h-1.5 rounded bg-muted overflow-hidden">
                <div
                  className="h-full bg-primary/70"
                  style={{ width: `${Math.max(6, (count / max) * 100)}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function SearchDistributionPanel({
  byDate,
  byRepository,
  byHand,
  byComponentFeature,
  isLoading = false,
  errorMessage = null,
}: SearchDistributionPanelProps) {
  if (isLoading) {
    return (
      <section className="rounded-lg border bg-white p-4">
        <h3 className="text-sm font-semibold mb-3">Allograph Distribution</h3>
        <p className="text-xs text-muted-foreground mb-3">Loading chart summaries...</p>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 animate-pulse">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="rounded border p-3 space-y-2">
              <div className="h-3 w-28 bg-muted rounded" />
              <div className="h-2 w-full bg-muted rounded" />
              <div className="h-2 w-5/6 bg-muted rounded" />
              <div className="h-2 w-4/6 bg-muted rounded" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (errorMessage) {
    return (
      <section className="rounded-lg border bg-white p-6 text-center">
        <h3 className="text-sm font-semibold">Distribution unavailable</h3>
        <p className="mt-1 text-xs text-muted-foreground">{errorMessage}</p>
      </section>
    );
  }

  return (
    <section className="rounded-lg border bg-white p-4">
      <h3 className="text-sm font-semibold mb-1">Allograph Distribution</h3>
      <p className="text-xs text-muted-foreground mb-3">
        Summary charts for the active graph filters and keyword query.
      </p>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
        <DistributionBlock title="Frequency by date (year)" data={byDate} />
        <DistributionBlock title="By repository" data={byRepository} />
        <DistributionBlock title="By scribe/hand" data={byHand} />
        <DistributionBlock title="Feature co-occurrence" data={byComponentFeature} />
      </div>
    </section>
  );
}
