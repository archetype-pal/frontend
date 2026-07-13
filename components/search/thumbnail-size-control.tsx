'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export type ThumbnailSize = 'small' | 'medium' | 'large';

const OPTIONS: { value: ThumbnailSize; label: string; title: string }[] = [
  { value: 'small', label: 'S', title: 'Small thumbnails' },
  { value: 'medium', label: 'M', title: 'Medium thumbnails' },
  { value: 'large', label: 'L', title: 'Large thumbnails' },
];

// S/M/L segmented control for the search results grid — mirrors the
// annotation gallery's DensityControl so the two feel like the same affordance.
export function ThumbnailSizeControl({
  size,
  onChange,
  className,
}: {
  size: ThumbnailSize;
  onChange: (value: ThumbnailSize) => void;
  className?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Thumbnail size"
      className={cn('inline-flex overflow-hidden rounded-md border', className)}
    >
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          role="radio"
          aria-checked={size === opt.value}
          aria-label={opt.title}
          title={opt.title}
          onClick={() => onChange(opt.value)}
          className={cn(
            'border-l px-2.5 py-1.5 text-xs font-medium transition first:border-l-0',
            size === opt.value
              ? 'bg-primary text-primary-foreground'
              : 'bg-background text-muted-foreground hover:bg-muted hover:text-foreground'
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
