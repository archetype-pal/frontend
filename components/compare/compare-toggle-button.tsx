'use client';

import * as React from 'react';
import { GitCompare, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { useCompareStore, MAX_COMPARE_ITEMS, type CompareItem } from '@/stores/compare-store';

export function CompareToggleButton({ item }: { item: CompareItem }) {
  const t = useTranslations('compare.toggle');
  const isInCompare = useCompareStore((state) =>
    state.items.some((i) => i.itemPartId === item.itemPartId)
  );
  const addItem = useCompareStore((state) => state.addItem);
  const removeItem = useCompareStore((state) => state.removeItem);

  const handleClick = () => {
    if (isInCompare) {
      removeItem(item.itemPartId);
      return;
    }
    const added = addItem(item);
    if (!added) {
      toast.error(t('atCapTitle'), { description: t('atCapDescription', { max: MAX_COMPARE_ITEMS }) });
    }
  };

  return (
    <Button type="button" variant={isInCompare ? 'secondary' : 'outline'} onClick={handleClick}>
      {isInCompare ? <X className="mr-2 h-4 w-4" /> : <GitCompare className="mr-2 h-4 w-4" />}
      {isInCompare ? t('remove') : t('add')}
    </Button>
  );
}
