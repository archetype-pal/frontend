import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div className="container mx-auto px-4 py-8">
      <main className="max-w-3xl">
        <Skeleton className="h-10 w-64 mb-8" />
        <Skeleton className="h-4 w-full mb-4" />
        <Skeleton className="h-4 w-full mb-4" />
        <Skeleton className="h-4 w-5/6 mb-8" />
        <Skeleton className="h-6 w-48 mb-4" />
        <Skeleton className="h-4 w-full mb-4" />
        <Skeleton className="h-4 w-full mb-8" />
      </main>
    </div>
  );
}
