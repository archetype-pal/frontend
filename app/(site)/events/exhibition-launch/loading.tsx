import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div className="container mx-auto px-4 py-8">
      <Skeleton className="h-10 w-40 mb-6" />
      <Skeleton className="h-40 w-full mb-6" />
      <Skeleton className="h-4 w-full" />
    </div>
  );
}
