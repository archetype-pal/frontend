'use client';

import { ImageIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { SortableItemCard } from '@/components/backoffice/common/sortable-item-card';
import type { OrderedItemCardProps } from '@/components/backoffice/common/ordered-items-page';
import { sanitizeHtml, stripHtml } from '@/lib/sanitize-html';
import type { CarouselItem } from '@/types/backoffice';

/** A carousel item's title may carry inline HTML: shown sanitized, stripped for the alt text. */
export function SortableCarouselCard(props: OrderedItemCardProps<CarouselItem>) {
  const t = useTranslations('backoffice');
  const { item } = props;
  return (
    <SortableItemCard
      {...props}
      dragLabel={t('carousel.dragToReorder')}
      image={item.image}
      imageAlt={stripHtml(item.title)}
      imageFit="cover"
      placeholderIcon={ImageIcon}
      title={<span dangerouslySetInnerHTML={{ __html: sanitizeHtml(item.title) }} />}
      subtitle={item.url}
    />
  );
}
