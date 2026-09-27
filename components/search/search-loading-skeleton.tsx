import { Skeleton } from '@/components/ui/skeleton';

// Placeholders shared by the route-level fallback (app/(site)/search/loading.tsx)
// and the result-type switch in SearchPage, so both paint the same shapes the
// loaded page settles into.

export function SearchFacetsSkeleton() {
  return (
    <div>
      <Skeleton className="mb-3 h-3.5 w-16" />
      {[...Array(4)].map((_, i) => (
        <div key={i} className="mb-2.5 rounded-lg border border-border/60 bg-card/50 p-3">
          <Skeleton className="mb-2 h-3.5 w-24" />
          <Skeleton className="h-3 w-full" />
        </div>
      ))}
    </div>
  );
}

export function SearchResultsSkeleton({ grid = false }: { grid?: boolean }) {
  if (grid) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {[...Array(18)].map((_, i) => (
          <div key={i} className="overflow-hidden rounded-lg border border-border">
            <Skeleton className="aspect-4/3 w-full rounded-none" />
            <div className="border-t border-border/70 p-2">
              <Skeleton className="h-3.5 w-3/4" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="h-10 border-b border-border bg-secondary" />
      {[...Array(20)].map((_, i) => (
        <div key={i} className="flex h-9 items-center gap-6 border-b border-border/60 px-2">
          <Skeleton className="h-3.5 w-1/4" />
          <Skeleton className="h-3.5 w-1/5" />
          <Skeleton className="h-3.5 w-1/6" />
          <Skeleton className="h-3.5 w-1/6" />
        </div>
      ))}
    </div>
  );
}
