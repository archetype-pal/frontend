import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-border bg-card px-4 pt-4 sm:px-6">
        <Skeleton className="h-3 w-72" />
        <Skeleton className="mt-3 h-9 w-80" />
        <Skeleton className="mt-2 h-4 w-full max-w-3xl" />
        <div className="mt-4 flex gap-4 pb-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-5 w-24" />
          ))}
        </div>
      </header>
      <div className="flex-1 p-4 sm:p-6">
        <Skeleton className="h-[70vh] w-full rounded-lg" />
      </div>
    </div>
  );
}
