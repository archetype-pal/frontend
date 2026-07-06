'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { GalleryHorizontal, ExternalLink } from 'lucide-react';
import {
  getLightboxGraphUrl,
  getLightboxImageUrl,
  getLightboxItemType,
  getLightboxItemsUrl,
} from '@/lib/lightbox-utils';
import type { GraphListItem, ImageListItem } from '@/types/search';
import type { CollectionItem } from '@/contexts/collection-context';

interface OpenLightboxButtonProps {
  item?: ImageListItem | GraphListItem | CollectionItem;
  items?: (ImageListItem | GraphListItem | CollectionItem)[];
  variant?: 'default' | 'outline' | 'ghost' | 'secondary';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  label?: string;
}

export function OpenLightboxButton({
  item,
  items,
  variant = 'ghost',
  size = 'sm',
  className,
  label,
}: OpenLightboxButtonProps) {
  const router = useRouter();
  const t = useTranslations('lightbox');
  const resolvedLabel = label ?? t('openButton');

  const handleClick = () => {
    let url: string | null = null;

    if (items && items.length > 0) {
      url = getLightboxItemsUrl(items);
    } else if (item) {
      const type = getLightboxItemType(item);
      url = type === 'image' ? getLightboxImageUrl(item.id) : getLightboxGraphUrl(item.id);
    }

    if (url) router.push(url);
  };

  if (!item && (!items || items.length === 0)) {
    return null;
  }

  const icon =
    size === 'icon' ? (
      <GalleryHorizontal className="h-4 w-4" />
    ) : (
      <ExternalLink className="h-4 w-4 mr-2" />
    );
  const visibleLabel = size !== 'icon' ? resolvedLabel : undefined;

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleClick}
      className={className}
      title={resolvedLabel}
      aria-label={size === 'icon' ? resolvedLabel : undefined}
    >
      {icon}
      {visibleLabel}
    </Button>
  );
}
