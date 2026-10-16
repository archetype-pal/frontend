import { getTranslations } from 'next-intl/server';

import { Skeleton } from '@/components/ui/skeleton';

// Same frame as the loaded gallery (toolbar, hand heading, one row per
// allograph), so nothing jumps when the graphs arrive.
const ROWS = [3, 1, 2];

export default async function AnnotationsLoading() {
  const t = await getTranslations('manuscript.gallery');
  return (
    <div className="px-4 py-6" role="status" aria-label={t('loading')}>
      <div className="space-y-6">
        <div className="rounded-lg border bg-card px-3 py-2.5 shadow-sm">
          <div className="flex flex-wrap items-center gap-2.5">
            <Skeleton className="h-9 w-64" />
            <Skeleton className="h-9 w-60" />
            <Skeleton className="h-9 w-28" />
            <Skeleton className="h-9 w-24" />
          </div>
          <Skeleton className="mt-3 h-4 w-56" />
        </div>

        <div>
          <Skeleton className="h-8 w-48" />
          <div className="mt-4 rounded-lg border bg-card">
            {ROWS.map((tiles, row) => (
              <div
                key={row}
                className="flex flex-wrap items-start gap-x-5 gap-y-3 border-t px-4 py-3.5 first:border-t-0"
              >
                <div className="flex w-full shrink-0 flex-col gap-2 sm:w-[10.5rem]">
                  <Skeleton className="h-[22px] w-[22px]" />
                  <Skeleton className="h-7 w-16" />
                </div>
                <div className="flex flex-1 flex-wrap gap-3">
                  {Array.from({ length: tiles }, (_, i) => (
                    <Skeleton key={i} className="aspect-square w-[10.5rem]" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
