'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';

import { Segmented, type SegmentedOption } from '@/components/ui/segmented';

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

// Thumbnail-size segmented control (G6.4). Arrow keys move between sizes.
export function DensityControl({
  density,
  onChange,
  className,
}: {
  density: ThumbDensity;
  onChange: (value: ThumbDensity) => void;
  className?: string;
}) {
  const t = useTranslations('common.thumbnailSize');
  const options: SegmentedOption<ThumbDensity>[] = [
    { value: 'compact', label: 'S', title: t('compact') },
    { value: 'comfortable', label: 'M', title: t('comfortable') },
    { value: 'large', label: 'L', title: t('large') },
  ];
  return (
    <Segmented
      ariaLabel={t('label')}
      value={density}
      options={options}
      onChange={onChange}
      className={className}
    />
  );
}
