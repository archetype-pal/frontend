import * as React from 'react';
import Link from 'next/link';
import { getIiifImageUrl } from '@/utils/iiif';
import type { ManuscriptImage } from '@/types/manuscript-image';

interface OtherImagesGridProps {
  manuscriptId: string;
  images: ManuscriptImage[];
  limit?: number;
}

export function OtherImagesGrid({ manuscriptId, images, limit = 20 }: OtherImagesGridProps) {
  if (images.length === 0) {
    return (
      <div className="rounded-md border border-dashed bg-muted/40 p-6 text-sm text-muted-foreground">
        No other manuscript images available.
      </div>
    );
  }

  const visible = images.slice(0, limit);

  return (
    <div className="space-y-4">
      {images.length > limit && (
        <p className="text-sm text-muted-foreground">
          Showing the first {limit} of {images.length} images in this manuscript.
        </p>
      )}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {visible.map((img) => {
          const thumbUrl = getIiifImageUrl(img.iiif_image, { thumbnail: true });
          return (
            <Link
              key={img.id}
              href={`/manuscripts/${manuscriptId}/images/${img.id}`}
              className="group flex flex-col gap-2 rounded-md border bg-card p-2 transition hover:border-primary"
            >
              <div className="aspect-[3/4] overflow-hidden rounded bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={thumbUrl}
                  alt={`Manuscript image ${img.locus}`}
                  className="h-full w-full object-contain"
                  loading="lazy"
                />
              </div>
              <div className="text-center text-sm font-medium group-hover:text-primary">
                {img.locus || `Image ${img.id}`}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
