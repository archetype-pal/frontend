import { Skeleton } from '@/components/ui/skeleton';

// Texts tab fallback. It renders inside [imageId]/layout.tsx, below the real
// header and tabs, so it only draws the body: the tab's list of text cards.
export default function Loading() {
  return (
    <div className="space-y-6 px-4 py-6">
      {[...Array(2)].map((_, i) => (
        <div key={i} className="rounded-md border bg-card">
          <div className="border-b px-4 py-3">
            <Skeleton className="h-5 w-40" />
          </div>
          <div className="space-y-2 p-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
}
