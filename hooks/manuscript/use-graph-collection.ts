'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { useCollection, type CollectionItem } from '@/contexts/collection-context';

export function useGraphCollection() {
  const t = useTranslations('manuscript.gallery');
  const router = useRouter();
  const { addItem, removeItem, removeItems, isInCollection } = useCollection();
  const viewCollection = { label: t('viewCollection'), onClick: () => router.push('/collection') };

  const addGraphs = (items: CollectionItem[]) => {
    const added = items.filter((item) => !isInCollection(item.id, 'graph'));
    const already = items.length - added.length;
    added.forEach((item) => addItem(item));
    if (added.length === 0) {
      toast.info(t('collectionAlreadyThere', { count: already }));
      return;
    }
    toast.success(t('collectionAdded', { count: added.length, already }), {
      action: {
        label: t('undo'),
        onClick: () => removeItems(added.map((item) => ({ id: item.id, type: 'graph' as const }))),
      },
      cancel: viewCollection,
    });
  };

  // The star on each graph: adds or removes just that graph, with Undo.
  const toggleGraph = (item: CollectionItem) => {
    const id = `gallery-collection-${item.id}`;
    if (isInCollection(item.id, 'graph')) {
      removeItem(item.id, 'graph');
      toast.success(t('collectionRemovedOne', { id: item.id }), {
        id,
        action: { label: t('undo'), onClick: () => addItem(item) },
      });
    } else {
      addItem(item);
      toast.success(t('collectionAddedOne', { id: item.id }), {
        id,
        action: { label: t('undo'), onClick: () => removeItem(item.id, 'graph') },
        cancel: viewCollection,
      });
    }
  };

  return { addGraphs, toggleGraph };
}
