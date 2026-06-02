'use client';

import * as React from 'react';

import {
  addCollection,
  createCollectionId,
  createDefaultCollectionStorage,
  deleteCollection,
  duplicateCollection,
  getActiveCollection,
  hasCollectionName,
  loadCollectionStorage,
  normalizeCollectionName,
  renameCollection,
  saveCollectionStorage,
  setActiveCollection,
  updateActiveCollectionItems,
  type CollectionItem,
  type CollectionPersistenceOptions,
  type NamedCollection,
} from '@/lib/collection-storage';

export type { CollectionItem, NamedCollection } from '@/lib/collection-storage';

type CollectionContextType = {
  items: CollectionItem[];
  collections: NamedCollection[];
  activeCollection: NamedCollection;
  canManageCollections: boolean;
  addItem: (item: CollectionItem) => void;
  removeItem: (id: number, type: 'image' | 'graph') => void;
  removeItems: (items: Array<Pick<CollectionItem, 'id' | 'type'>>) => void;
  isInCollection: (id: number, type: 'image' | 'graph') => boolean;
  clearCollection: () => void;
  createCollection: (name: string, items?: CollectionItem[]) => boolean;
  switchCollection: (collectionId: string) => void;
  renameActiveCollection: (name: string) => boolean;
  duplicateActiveCollection: (name: string) => boolean;
  deleteActiveCollection: () => boolean;
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
  const activeCollection = React.useMemo(() => getActiveCollection(storageState), [storageState]);
  const items = activeCollection.items;

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

  const removeItems = React.useCallback(
    (itemsToRemove: Array<Pick<CollectionItem, 'id' | 'type'>>) => {
      const keys = new Set(itemsToRemove.map((item) => `${item.type}:${item.id}`));
      if (keys.size === 0) return;

      setStorageState((prev) =>
        updateActiveCollectionItems(prev, (items) =>
          items.filter((item) => !keys.has(`${item.type}:${item.id}`))
        )
      );
    },
    []
  );

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

  const createCollection = React.useCallback(
    (requestedName: string, items: CollectionItem[] = []) => {
      if (!persistenceOptions.writeVersionedState) return false;

      const name = normalizeCollectionName(requestedName);
      if (!name || hasCollectionName(storageState, name)) return false;

      const id = createCollectionId();
      setStorageState((prev) => addCollection(prev, { id, name }, items));
      return true;
    },
    [persistenceOptions.writeVersionedState, storageState]
  );

  const switchCollection = React.useCallback(
    (collectionId: string) => {
      if (!persistenceOptions.writeVersionedState) return;
      setStorageState((prev) => setActiveCollection(prev, collectionId));
    },
    [persistenceOptions.writeVersionedState]
  );

  const renameActiveCollection = React.useCallback(
    (requestedName: string) => {
      if (!persistenceOptions.writeVersionedState) return false;

      const name = normalizeCollectionName(requestedName);
      if (!name || hasCollectionName(storageState, name, activeCollection.id)) return false;

      setStorageState((prev) => renameCollection(prev, activeCollection.id, name));
      return true;
    },
    [activeCollection.id, persistenceOptions.writeVersionedState, storageState]
  );

  const duplicateActiveCollection = React.useCallback(
    (requestedName: string) => {
      if (!persistenceOptions.writeVersionedState) return false;

      const name = normalizeCollectionName(requestedName);
      if (!name || hasCollectionName(storageState, name)) return false;

      const id = createCollectionId();
      setStorageState((prev) => duplicateCollection(prev, activeCollection.id, { id, name }));
      return true;
    },
    [activeCollection.id, persistenceOptions.writeVersionedState, storageState]
  );

  const deleteActiveCollection = React.useCallback(() => {
    if (!persistenceOptions.writeVersionedState || storageState.collections.length <= 1) {
      return false;
    }

    setStorageState((prev) => deleteCollection(prev, activeCollection.id));
    return true;
  }, [
    activeCollection.id,
    persistenceOptions.writeVersionedState,
    storageState.collections.length,
  ]);

  const value = React.useMemo(
    () => ({
      items,
      collections: storageState.collections,
      activeCollection,
      canManageCollections: persistenceOptions.writeVersionedState,
      addItem,
      removeItem,
      removeItems,
      isInCollection,
      clearCollection,
      createCollection,
      switchCollection,
      renameActiveCollection,
      duplicateActiveCollection,
      deleteActiveCollection,
    }),
    [
      items,
      storageState.collections,
      activeCollection,
      persistenceOptions.writeVersionedState,
      addItem,
      removeItem,
      removeItems,
      isInCollection,
      clearCollection,
      createCollection,
      switchCollection,
      renameActiveCollection,
      duplicateActiveCollection,
      deleteActiveCollection,
    ]
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
