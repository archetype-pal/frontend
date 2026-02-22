'use client';

import * as React from 'react';
import NextImage from 'next/image';
import type { LightboxImage } from '@/lib/lightbox-db';
import { cn } from '@/lib/utils';

interface LightboxAnnotationsProps {
  image: LightboxImage;
}

/**
 * Lightbox annotations placeholder. Annotations (draw, edit, comment) require
 * the full manuscript viewer with OpenSeadragon; the lightbox uses static images only.
 */
export function LightboxAnnotations({ image }: LightboxAnnotationsProps) {
  return (
    <div className="relative w-full h-full bg-gray-100">
      {image.imageUrl ? (
        <NextImage
          src={image.imageUrl}
          alt={image.metadata.shelfmark || image.metadata.locus || 'Image'}
          fill
          className="object-contain"
          unoptimized
          draggable={false}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-sm text-gray-500">
          No image
        </div>
      )}
      <div
        className={cn(
          'absolute inset-x-0 bottom-0 bg-black/70 text-white text-xs px-3 py-2 text-center'
        )}
      >
        Annotations are not available in the lightbox. Use the manuscript viewer for full zoom and
        annotation support.
      </div>
    </div>
  );
}
