'use client';

import { Handshake } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { SortableItemCard } from '@/components/backoffice/common/sortable-item-card';
import type { OrderedItemCardProps } from '@/components/backoffice/common/ordered-items-page';
import type { PartnerItem } from '@/types/backoffice';

export function SortablePartnerCard(props: OrderedItemCardProps<PartnerItem>) {
  const t = useTranslations('backoffice');
  const { item } = props;
  return (
    <SortableItemCard
      {...props}
      dragLabel={t('partners.dragToReorder')}
      image={item.logo}
      imageAlt={item.name}
      imageFit="contain"
      placeholderIcon={Handshake}
      title={item.name}
      subtitle={item.url}
    />
  );
}
