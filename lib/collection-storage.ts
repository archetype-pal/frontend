export type CollectionItem = {
  id: number;
  type: 'image' | 'graph';
  item_part?: number | null;
  item_image?: number | null;
  image_iiif?: string;
  coordinates?: string;
  annotation_type?: string | null;
  shelfmark?: string;
  locus?: string;
  repository_name?: string;
  repository_city?: string;
  date?: string;
  [key: string]: unknown;
};

export type NamedCollection = {
  id: string;
  name: string;
  items: CollectionItem[];
};

export type CollectionStorageState = {
  version: typeof COLLECTION_STORAGE_VERSION;
  activeCollectionId: string;
  collections: NamedCollection[];
};

export type CollectionPersistenceOptions = {
  writeVersionedState: boolean;
  writeLegacyItems: boolean;
};

type StorageReader = Pick<Storage, 'getItem'>;
type StorageWriter = Pick<Storage, 'setItem'>;

export const COLLECTION_STORAGE_VERSION = 2;
export const COLLECTION_STORAGE_KEY = 'archetype_collections';
export const LEGACY_COLLECTION_STORAGE_KEY = 'archetype_collection';
export const MAX_COLLECTION_NAME_LENGTH = 100;

const DEFAULT_COLLECTION_ID = 'default';
const DEFAULT_COLLECTION_NAME = 'Collection';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function sanitizeItems(value: unknown): CollectionItem[] {
  if (!Array.isArray(value)) return [];

  const items: CollectionItem[] = [];
  const seen = new Set<string>();

  for (const item of value) {
    if (
      !isRecord(item) ||
      typeof item.id !== 'number' ||
      !Number.isFinite(item.id) ||
      (item.type !== 'image' && item.type !== 'graph')
    ) {
      continue;
    }

    const key = `${item.type}:${item.id}`;
    if (seen.has(key)) continue;

    seen.add(key);
    items.push({ ...item, id: item.id, type: item.type });
  }

  return items;
}

function readLegacyItems(storage: StorageReader): {
  items: CollectionItem[];
  canWriteLegacyItems: boolean;
} {
  const raw = storage.getItem(LEGACY_COLLECTION_STORAGE_KEY);
  if (raw === null) return { items: [], canWriteLegacyItems: true };

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return { items: [], canWriteLegacyItems: false };
    return { items: sanitizeItems(parsed), canWriteLegacyItems: true };
  } catch {
    return { items: [], canWriteLegacyItems: false };
  }
}

function parseVersionedState(raw: string): CollectionStorageState | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (
      !isRecord(parsed) ||
      parsed.version !== COLLECTION_STORAGE_VERSION ||
      !Array.isArray(parsed.collections)
    ) {
      return null;
    }

    const collections: NamedCollection[] = [];
    const seenIds = new Set<string>();

    for (const collection of parsed.collections) {
      if (
        !isRecord(collection) ||
        typeof collection.id !== 'string' ||
        collection.id.length === 0 ||
        typeof collection.name !== 'string' ||
        collection.name.trim().length === 0 ||
        !Array.isArray(collection.items) ||
        seenIds.has(collection.id)
      ) {
        continue;
      }

      seenIds.add(collection.id);
      collections.push({
        id: collection.id,
        name: collection.name.trim(),
        items: sanitizeItems(collection.items),
      });
    }

    if (collections.length === 0) return null;

    const requestedActiveId =
      typeof parsed.activeCollectionId === 'string' ? parsed.activeCollectionId : '';
    const activeCollectionId = collections.some((collection) => collection.id === requestedActiveId)
      ? requestedActiveId
      : collections[0].id;

    return {
      version: COLLECTION_STORAGE_VERSION,
      activeCollectionId,
      collections,
    };
  } catch {
    return null;
  }
}

export function createDefaultCollectionStorage(
  items: CollectionItem[] = []
): CollectionStorageState {
  return {
    version: COLLECTION_STORAGE_VERSION,
    activeCollectionId: DEFAULT_COLLECTION_ID,
    collections: [
      {
        id: DEFAULT_COLLECTION_ID,
        name: DEFAULT_COLLECTION_NAME,
        items: sanitizeItems(items),
      },
    ],
  };
}

export function loadCollectionStorage(storage: StorageReader): {
  state: CollectionStorageState;
  persistenceOptions: CollectionPersistenceOptions;
} {
  const versionedRaw = storage.getItem(COLLECTION_STORAGE_KEY);
  const legacy = readLegacyItems(storage);

  if (versionedRaw !== null) {
    const state = parseVersionedState(versionedRaw);
    if (state) {
      return {
        state,
        persistenceOptions: {
          writeVersionedState: true,
          writeLegacyItems: true,
        },
      };
    }

    // Preserve malformed or newer-version data. The app can still use the
    // legacy mirror without destructively replacing data it does not understand.
    return {
      state: createDefaultCollectionStorage(legacy.items),
      persistenceOptions: {
        writeVersionedState: false,
        writeLegacyItems: legacy.canWriteLegacyItems,
      },
    };
  }

  return {
    state: createDefaultCollectionStorage(legacy.items),
    persistenceOptions: {
      writeVersionedState: legacy.canWriteLegacyItems,
      writeLegacyItems: legacy.canWriteLegacyItems,
    },
  };
}

export function getActiveCollection(state: CollectionStorageState): NamedCollection {
  return (
    state.collections.find((collection) => collection.id === state.activeCollectionId) ??
    state.collections[0]
  );
}

export function updateActiveCollectionItems(
  state: CollectionStorageState,
  update: (items: CollectionItem[]) => CollectionItem[]
): CollectionStorageState {
  const activeCollection = getActiveCollection(state);

  return {
    ...state,
    collections: state.collections.map((collection) =>
      collection.id === activeCollection.id
        ? { ...collection, items: update(collection.items) }
        : collection
    ),
  };
}

export function normalizeCollectionName(name: string): string {
  return name.trim().replace(/\s+/g, ' ').slice(0, MAX_COLLECTION_NAME_LENGTH);
}

export function createCollectionId(randomSource: Crypto = crypto): string {
  if (typeof randomSource.randomUUID === 'function') {
    return randomSource.randomUUID();
  }

  const values = randomSource.getRandomValues(new Uint32Array(4));
  return Array.from(values, (value) => value.toString(16).padStart(8, '0')).join('-');
}

export function hasCollectionName(state: CollectionStorageState, name: string): boolean {
  const normalizedName = normalizeCollectionName(name).toLocaleLowerCase();
  if (!normalizedName) return false;

  return state.collections.some(
    (collection) => collection.name.toLocaleLowerCase() === normalizedName
  );
}

export function addCollection(
  state: CollectionStorageState,
  collection: Pick<NamedCollection, 'id' | 'name'>
): CollectionStorageState {
  const name = normalizeCollectionName(collection.name);
  if (
    !name ||
    hasCollectionName(state, name) ||
    state.collections.some((current) => current.id === collection.id)
  ) {
    return state;
  }

  return {
    ...state,
    activeCollectionId: collection.id,
    collections: [...state.collections, { id: collection.id, name, items: [] }],
  };
}

export function setActiveCollection(
  state: CollectionStorageState,
  collectionId: string
): CollectionStorageState {
  if (
    state.activeCollectionId === collectionId ||
    !state.collections.some((collection) => collection.id === collectionId)
  ) {
    return state;
  }

  return {
    ...state,
    activeCollectionId: collectionId,
  };
}

export function saveCollectionStorage(
  storage: StorageWriter,
  state: CollectionStorageState,
  options: CollectionPersistenceOptions
): void {
  if (options.writeVersionedState) {
    try {
      storage.setItem(COLLECTION_STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Ignore storage errors so collection actions still work for this tab.
    }
  }

  if (options.writeLegacyItems) {
    try {
      storage.setItem(
        LEGACY_COLLECTION_STORAGE_KEY,
        JSON.stringify(getActiveCollection(state).items)
      );
    } catch {
      // Keep the versioned write independent from the rollback-compatible mirror.
    }
  }
}
