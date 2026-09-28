import { Skeleton } from '@/components/ui/skeleton';
import { ViewerLoadingState } from '@/components/manuscript/viewer-status-screen';

// Shown while [imageId]/layout.tsx awaits the image, its manuscript and the tab
// counts. Without it the nearest fallback is the manuscript overview's skeleton,
// a different page's shape. Mirrors the layout's header, then the viewer body.
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
      <div className="flex-1">
        <ViewerLoadingState />
      </div>
    </div>
  );
}
