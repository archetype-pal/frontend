import * as React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

// Streamed while the server component awaits its fetches, so the gallery's
// structure (toolbar + grouped thumb grid) paints immediately instead of a
// blank tab. Mirrors the AnnotationGallery layout: a sticky-ish toolbar row
// followed by hand sections of allograph thumb grids.
export default function Loading() {
  return (
    <div className="px-4 py-6">
      <div className="space-y-10">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border bg-card px-4 py-3 shadow-sm">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-8 w-40" />
        </div>

        {/* Hand sections */}
        {[...Array(2)].map((_, section) => (
          <section key={section} className="space-y-4">
            <div className="border-b pb-3">
              <Skeleton className="h-7 w-48" />
              <div className="mt-3 flex flex-wrap gap-2">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-7 w-24 rounded-md" />
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <Skeleton className="h-6 w-32" />
              <div className="flex flex-wrap gap-3">
                {[...Array(section === 0 ? 8 : 4)].map((_, i) => (
                  <Skeleton key={i} className="aspect-square w-[10.5rem] rounded" />
                ))}
              </div>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
