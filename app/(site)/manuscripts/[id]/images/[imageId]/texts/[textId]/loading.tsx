import { Skeleton } from '@/components/ui/skeleton';

// Single-text fallback; without it the texts tab's list placeholder would show.
export default function Loading() {
  return (
    <div className="px-4 py-6">
      <div className="mb-4">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="mt-3 h-6 w-40" />
        <Skeleton className="mt-2 h-4 w-24" />
      </div>
      <div className="space-y-2 rounded-md border bg-card p-6">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    </div>
  );
}
