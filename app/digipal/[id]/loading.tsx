import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <main className="container mx-auto p-4 max-w-6xl">
      <Skeleton className="h-10 w-2/3 mb-6" />
      <Skeleton className="h-[60vh] w-full" />
    </main>
  );
}
