import { Skeleton } from '@/components/ui/skeleton';

// Other images tab fallback. It renders inside [imageId]/layout.tsx, below the
// real header and tabs, so it only draws the body: OtherImagesGrid's cards.
export default function Loading() {
  return (
    <div className="px-4 py-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex flex-col gap-2 rounded-md border bg-card p-2">
            <Skeleton className="aspect-[3/4] w-full rounded" />
            <Skeleton className="mx-auto h-4 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}
