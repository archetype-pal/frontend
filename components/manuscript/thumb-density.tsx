'use client';

import { useTranslations } from 'next-intl';

import { useStoredPreference } from '@/hooks/use-stored-preference';

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
const parseDensity = (raw: string | null): ThumbDensity =>
  raw === 'compact' || raw === 'comfortable' || raw === 'large' ? raw : 'comfortable';
const serializeDensity = (density: ThumbDensity) => density;

/** Graph thumbnail density, persisted across sessions and shared by every graph gallery. */
export function useThumbDensity() {
  return useStoredPreference(STORAGE_KEY, parseDensity, serializeDensity, 'comfortable');
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
