'use client';

import { useTranslations } from 'next-intl';

import { Segmented, type SegmentedOption } from '@/components/ui/segmented';

export type ThumbnailSize = 'small' | 'medium' | 'large';

/** S/M/L control for the search results grid; the same affordance as the annotation gallery's. */
export function ThumbnailSizeControl({
  size,
  onChange,
  className,
}: {
  size: ThumbnailSize;
  onChange: (value: ThumbnailSize) => void;
  className?: string;
}) {
  const t = useTranslations('common.thumbnailSize');
  const options: SegmentedOption<ThumbnailSize>[] = [
    { value: 'small', label: 'S', title: t('compact'), ariaLabel: t('compact') },
    { value: 'medium', label: 'M', title: t('comfortable'), ariaLabel: t('comfortable') },
    { value: 'large', label: 'L', title: t('large'), ariaLabel: t('large') },
  ];
  return (
    <Segmented
      ariaLabel={t('label')}
      value={size}
      options={options}
      onChange={onChange}
      className={className}
    />
  );
}
