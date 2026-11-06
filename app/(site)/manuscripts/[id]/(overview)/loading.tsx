import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <main className="mx-auto max-w-6xl px-4 pb-24 pt-6 sm:px-6">
      <Skeleton className="h-4 w-56" />

      {/* Hero */}
      <div className="mt-8 grid items-end gap-10 lg:grid-cols-[1fr_minmax(0,40%)] lg:gap-14">
        <div>
          <Skeleton className="h-3 w-40" />
          <Skeleton className="mt-5 h-14 w-3/4" />
          <Skeleton className="mt-5 h-6 w-52" />
          <Skeleton className="mt-3 h-5 w-64" />
          <div className="mt-8 flex gap-10">
            {[...Array(3)].map((_, i) => (
              <div key={i}>
                <Skeleton className="h-8 w-12" />
                <Skeleton className="mt-2 h-3 w-16" />
              </div>
            ))}
          </div>
          <Skeleton className="mt-8 h-10 w-44" />
        </div>
        <Skeleton className="aspect-[4/3] w-full rounded-lg" />
      </div>

      {/* Description */}
      <div className="mt-20">
        <Skeleton className="h-9 w-64" />
        <div className="mt-8 max-w-3xl space-y-3">
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-2/3" />
        </div>
      </div>

      {/* Images */}
      <div className="mt-20">
        <Skeleton className="h-9 w-48" />
        <div className="mt-8 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i}>
              <Skeleton className="aspect-square w-full rounded-md" />
              <Skeleton className="mt-2.5 h-4 w-2/3" />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
