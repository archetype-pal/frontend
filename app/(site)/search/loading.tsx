import { Skeleton } from '@/components/ui/skeleton';
import {
  SearchFacetsSkeleton,
  SearchResultsSkeleton,
} from '@/components/search/search-loading-skeleton';

/**
 * Route-level fallback for the search page. Mirrors the real search shell —
 * the two-row header (count · keyword · actions, then the result-type tabs),
 * the filter rail, and the default table view — so the transition into the
 * loaded page doesn't reflow.
 */
export default function SearchLoading() {
  return (
    <div className="flex min-h-[calc(100dvh-var(--site-header-h,0px))] flex-col bg-background">
      <div className="flex shrink-0 flex-col gap-2.5 border-b border-border bg-card px-3 py-2.5 sm:px-5">
        <div className="flex items-center gap-3 sm:gap-4">
          <Skeleton className="h-9 w-28 shrink-0" />
          <div className="min-w-0 flex-1">
            <Skeleton className="hidden h-9 md:block md:max-w-2xl" />
          </div>
          <Skeleton className="h-9 w-24 shrink-0 rounded-md" />
        </div>
        <div className="flex gap-2 overflow-hidden">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-7 w-24 shrink-0 rounded-md" />
          ))}
        </div>
      </div>
      <div className="flex flex-1 items-start">
        <aside className="hidden w-64 shrink-0 border-r border-border bg-background p-3 md:block">
          <SearchFacetsSkeleton />
        </aside>
        <main className="min-w-0 flex-1">
          <SearchResultsSkeleton />
        </main>
      </div>
    </div>
  );
}
