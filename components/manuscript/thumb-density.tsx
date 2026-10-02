'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';

import { cn } from '@/lib/utils';

export type ThumbDensity = 'compact' | 'comfortable' | 'large';

// Tailwind width classes per density (G6.4). Footer slot widths must match the
// thumb so the grid stays aligned.
export const DENSITY_WIDTH: Record<ThumbDensity, string> = {
  compact: 'w-28',
  comfortable: 'w-[10.5rem]',
  large: 'w-56',
};
export const DENSITY_THUMB_PX: Record<ThumbDensity, number> = {
  compact: 320,
  comfortable: 500,
  large: 700,
};

const STORAGE_KEY = 'annotation-gallery-density';

/** Graph thumbnail density, persisted across sessions and shared by every graph gallery. */
export function useThumbDensity(): [ThumbDensity, (next: ThumbDensity) => void] {
  const [density, setDensity] = React.useState<ThumbDensity>('comfortable');
  React.useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- seed locally-owned state from localStorage after mount; deferring to an effect (vs. a lazy useState initializer) is required to avoid an SSR/client hydration mismatch, since `window` is unavailable during server render.
    if (saved === 'compact' || saved === 'comfortable' || saved === 'large') setDensity(saved);
  }, []);
  const changeDensity = React.useCallback((next: ThumbDensity) => {
    setDensity(next);
    window.localStorage.setItem(STORAGE_KEY, next);
  }, []);
  return [density, changeDensity];
}

// Thumbnail-size segmented control (G6.4).
export function DensityControl({
  density,
  onChange,
}: {
  density: ThumbDensity;
  onChange: (value: ThumbDensity) => void;
}) {
  const t = useTranslations('common.thumbnailSize');
  const options: { value: ThumbDensity; label: string; title: string }[] = [
    { value: 'compact', label: 'S', title: t('compact') },
    { value: 'comfortable', label: 'M', title: t('comfortable') },
    { value: 'large', label: 'L', title: t('large') },
  ];
  return (
    <div
      role="radiogroup"
      aria-label={t('label')}
      className="inline-flex overflow-hidden rounded-md border"
    >
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          role="radio"
          aria-checked={density === opt.value}
          title={opt.title}
          onClick={() => onChange(opt.value)}
          className={cn(
            'border-l px-2.5 py-1.5 text-xs font-medium transition first:border-l-0',
            density === opt.value
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
