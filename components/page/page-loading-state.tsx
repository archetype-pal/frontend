'use client';

import { Skeleton } from '@/components/ui/skeleton';

export function PageLoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex h-screen items-center justify-center bg-gray-50">
      <p className="text-muted-foreground">{label}</p>
    </div>
  );
}

export function PublicationListLoadingSkeleton() {
  return (
    <main className="container mx-auto p-4 max-w-4xl">
      <Skeleton className="h-10 w-48 mb-6" />
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-4 w-1/3" />
          </div>
        ))}
      </div>
    </main>
  );
}

export function PublicationDetailLoadingSkeleton() {
  return (
    <main className="container mx-auto p-4 max-w-4xl">
      <Skeleton className="h-4 w-32 mb-4" />
      <Skeleton className="h-10 w-3/4 mb-2" />
      <Skeleton className="h-5 w-48 mb-8" />
      <div className="space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    </main>
  );
}
