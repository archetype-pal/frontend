import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div className="container mx-auto px-4 py-8">
      <Skeleton className="h-10 w-56 mb-8" />
      <div className="space-y-4">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4 mb-8" />
        <Skeleton className="h-6 w-44 mb-4" />
        <Skeleton className="h-4 w-full" />
      </div>
    </div>
  );
}
