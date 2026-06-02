'use client';

import * as React from 'react';

import {
  createDefaultCollectionStorage,
  getActiveCollection,
  loadCollectionStorage,
  saveCollectionStorage,
  updateActiveCollectionItems,
  type CollectionItem,
  type CollectionPersistenceOptions,
} from '@/lib/collection-storage';

export type { CollectionItem } from '@/lib/collection-storage';

type CollectionContextType = {
  items: CollectionItem[];
  addItem: (item: CollectionItem) => void;
  removeItem: (id: number, type: 'image' | 'graph') => void;
  isInCollection: (id: number, type: 'image' | 'graph') => boolean;
  clearCollection: () => void;
};

const CollectionContext = React.createContext<CollectionContextType | undefined>(undefined);

const DEFAULT_PERSISTENCE_OPTIONS: CollectionPersistenceOptions = {
  writeVersionedState: true,
  writeLegacyItems: true,
};

export function CollectionProvider({ children }: { children: React.ReactNode }) {
  // Always start with an empty collection to avoid hydration mismatch.
  const [storageState, setStorageState] = React.useState(createDefaultCollectionStorage);
  const [persistenceOptions, setPersistenceOptions] = React.useState(DEFAULT_PERSISTENCE_OPTIONS);
  const [isHydrated, setIsHydrated] = React.useState(false);
  const items = React.useMemo(() => getActiveCollection(storageState).items, [storageState]);

  // Load from localStorage only on client after mount
  React.useEffect(() => {
    const loaded = loadCollectionStorage(localStorage);
    let isCancelled = false;

    queueMicrotask(() => {
      if (isCancelled) return;
      setStorageState(loaded.state);
      setPersistenceOptions(loaded.persistenceOptions);
      setIsHydrated(true);
    });

    return () => {
      isCancelled = true;
    };
  }, []);

  // Keep the new model and the rollback-compatible active-items mirror in sync.
  React.useEffect(() => {
    if (isHydrated) {
      saveCollectionStorage(localStorage, storageState, persistenceOptions);
    }
  }, [storageState, persistenceOptions, isHydrated]);

  const addItem = React.useCallback((item: CollectionItem) => {
    setStorageState((prev) =>
      updateActiveCollectionItems(prev, (items) => {
        // Check if item already exists
        const exists = items.some(
          (current) => current.id === item.id && current.type === item.type
        );
        if (exists) return items;
        return [...items, item];
      })
    );
  }, []);

  const removeItem = React.useCallback((id: number, type: 'image' | 'graph') => {
    setStorageState((prev) =>
      updateActiveCollectionItems(prev, (items) =>
        items.filter((item) => !(item.id === id && item.type === type))
      )
    );
  }, []);

  const collectionSet = React.useMemo(
    () => new Set(items.map((i) => `${i.type}:${i.id}`)),
    [items]
  );

  const isInCollection = React.useCallback(
    (id: number, type: 'image' | 'graph') => collectionSet.has(`${type}:${id}`),
    [collectionSet]
  );

  const clearCollection = React.useCallback(() => {
    setStorageState((prev) => updateActiveCollectionItems(prev, () => []));
  }, []);

  const value = React.useMemo(
    () => ({
      items,
      addItem,
      removeItem,
      isInCollection,
      clearCollection,
    }),
    [items, addItem, removeItem, isInCollection, clearCollection]
  );

  return <CollectionContext.Provider value={value}>{children}</CollectionContext.Provider>;
}

export function useCollection() {
  const context = React.useContext(CollectionContext);
  if (context === undefined) {
    throw new Error('useCollection must be used within a CollectionProvider');
  }
  return context;
}
