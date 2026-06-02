'use client';

import * as React from 'react';

import type { CollectionItem } from '@/contexts/collection-context';

type CollectionItemSelectionState = {
  collectionId: string;
  itemKeys: Set<string>;
};

const EMPTY_ITEM_KEYS = new Set<string>();

export function getCollectionItemKey(item: Pick<CollectionItem, 'id' | 'type'>): string {
  return `${item.type}:${item.id}`;
}

export function useCollectionItemSelection(
  collectionId: string,
  items: CollectionItem[],
  visibleItems: CollectionItem[]
) {
  const [selection, setSelection] = React.useState<CollectionItemSelectionState>(() => ({
    collectionId,
    itemKeys: new Set(),
  }));
  const validItemKeys = React.useMemo(() => new Set(items.map(getCollectionItemKey)), [items]);
  const selectedItemKeys = React.useMemo(() => {
    if (selection.collectionId !== collectionId) return EMPTY_ITEM_KEYS;

    return new Set([...selection.itemKeys].filter((key) => validItemKeys.has(key)));
  }, [collectionId, selection, validItemKeys]);
  const selectedItems = React.useMemo(
    () => items.filter((item) => selectedItemKeys.has(getCollectionItemKey(item))),
    [items, selectedItemKeys]
  );
  const visibleSelectedCount = React.useMemo(
    () => visibleItems.filter((item) => selectedItemKeys.has(getCollectionItemKey(item))).length,
    [selectedItemKeys, visibleItems]
  );

  const updateItemKeys = React.useCallback(
    (update: (itemKeys: Set<string>) => void) => {
      setSelection((current) => {
        const itemKeys = new Set(
          current.collectionId === collectionId
            ? [...current.itemKeys].filter((key) => validItemKeys.has(key))
            : []
        );
        update(itemKeys);
        return { collectionId, itemKeys };
      });
    },
    [collectionId, validItemKeys]
  );

  const isItemSelected = React.useCallback(
    (item: Pick<CollectionItem, 'id' | 'type'>) => selectedItemKeys.has(getCollectionItemKey(item)),
    [selectedItemKeys]
  );

  const toggleItem = React.useCallback(
    (item: Pick<CollectionItem, 'id' | 'type'>) => {
      const key = getCollectionItemKey(item);
      updateItemKeys((itemKeys) => {
        if (itemKeys.has(key)) {
          itemKeys.delete(key);
        } else {
          itemKeys.add(key);
        }
      });
    },
    [updateItemKeys]
  );

  const toggleVisibleItems = React.useCallback(
    (checked: boolean) => {
      updateItemKeys((itemKeys) => {
        visibleItems.forEach((item) => {
          const key = getCollectionItemKey(item);
          if (checked) {
            itemKeys.add(key);
          } else {
            itemKeys.delete(key);
          }
        });
      });
    },
    [updateItemKeys, visibleItems]
  );

  const clearSelection = React.useCallback(() => {
    setSelection({ collectionId, itemKeys: new Set() });
  }, [collectionId]);

  return {
    selectedItems,
    visibleSelectedCount,
    allVisibleItemsSelected:
      visibleItems.length > 0 && visibleSelectedCount === visibleItems.length,
    someVisibleItemsSelected:
      visibleSelectedCount > 0 && visibleSelectedCount < visibleItems.length,
    isItemSelected,
    toggleItem,
    toggleVisibleItems,
    clearSelection,
  };
}
