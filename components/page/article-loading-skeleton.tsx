import { Skeleton } from '@/components/ui/skeleton';

export function ArticleLoadingSkeleton({
  titleWidth,
  introWidth,
  sectionWidth,
}: {
  titleWidth: string;
  introWidth: string;
  sectionWidth: string;
}) {
  return (
    <div className="container mx-auto px-4 py-8">
      <main className="max-w-3xl">
        <Skeleton className={`h-10 ${titleWidth} mb-8`} />
        <Skeleton className="h-4 w-full mb-4" />
        <Skeleton className="h-4 w-full mb-4" />
        <Skeleton className={`h-4 ${introWidth} mb-8`} />
        <Skeleton className={`h-6 ${sectionWidth} mb-4`} />
        <Skeleton className="h-4 w-full mb-4" />
        <Skeleton className="h-4 w-full mb-8" />
      </main>
    </div>
  );
}
