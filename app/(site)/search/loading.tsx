import { Skeleton } from '@/components/ui/skeleton';

/**
 * Route-level fallback for the search page. Mirrors the real search shell —
 * parchment header bar, filter rail, and a card of result tiles — so the
 * transition into the loaded page doesn't reflow.
 */
export default function SearchLoading() {
  return (
    <div className="flex h-screen flex-col bg-background">
      <div className="flex shrink-0 items-center gap-4 border-b border-border bg-card px-3 py-2.5 sm:px-5">
        <Skeleton className="h-9 w-24" />
        <div className="flex flex-1 gap-2 overflow-hidden">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-7 w-20 shrink-0 rounded-md" />
          ))}
        </div>
        <Skeleton className="h-9 w-20 shrink-0 rounded-md" />
      </div>
      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-64 shrink-0 border-r border-border bg-background p-3 md:block">
          <Skeleton className="mb-3 h-3.5 w-16" />
          {[...Array(4)].map((_, i) => (
            <div key={i} className="mb-2.5 rounded-lg border border-border/60 bg-card/50 p-3">
              <Skeleton className="mb-2 h-3.5 w-24" />
              <Skeleton className="h-3 w-full" />
            </div>
          ))}
        </aside>
        <main className="min-w-0 flex-1 overflow-hidden p-2 sm:p-3">
          <div className="rounded-xl border border-border/80 bg-card p-3 shadow-sm">
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
          </div>
        </main>
      </div>
    </div>
  );
}
