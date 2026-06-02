import {
  normalizeCollectionName,
  type CollectionItem,
  type NamedCollection,
} from './collection-storage';

export const PORTABLE_COLLECTION_SCHEMA = 'archetype.collection';
export const PORTABLE_COLLECTION_VERSION = 1;
export const MAX_PORTABLE_COLLECTION_BYTES = 5 * 1024 * 1024;

export type PortableCollectionFile = {
  schema: typeof PORTABLE_COLLECTION_SCHEMA;
  version: typeof PORTABLE_COLLECTION_VERSION;
  collection: {
    name: string;
    items: CollectionItem[];
  };
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getPortableFileSize(raw: string): number {
  return new TextEncoder().encode(raw).byteLength;
}

function requirePositiveInteger(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) {
    throw new Error(`${field} must be a positive integer.`);
  }

  return value;
}

function copyOptionalPositiveInteger(
  source: Record<string, unknown>,
  target: CollectionItem,
  field: 'item_part' | 'item_image'
) {
  const value = source[field];
  if (value === undefined) return;

  target[field] = value === null ? null : requirePositiveInteger(value, field);
}

function copyOptionalString(
  source: Record<string, unknown>,
  target: CollectionItem,
  field:
    | 'image_iiif'
    | 'coordinates'
    | 'allograph'
    | 'character'
    | 'character_type'
    | 'hand_name'
    | 'shelfmark'
    | 'locus'
    | 'repository_name'
    | 'repository_city'
    | 'date'
) {
  const value = source[field];
  if (value === undefined) return;

  if (typeof value !== 'string') {
    throw new Error(`${field} must be a string.`);
  }

  target[field] = value;
}

function copyOptionalAnnotationType(source: Record<string, unknown>, target: CollectionItem) {
  const value = source.annotation_type;
  if (value === undefined) return;

  if (value !== null && typeof value !== 'string') {
    throw new Error('annotation_type must be a string or null.');
  }

  target.annotation_type = value;
}

function toPortableCollectionItem(value: unknown, index: number): CollectionItem {
  if (!isRecord(value)) {
    throw new Error(`Collection item ${index + 1} must be an object.`);
  }

  if (value.type !== 'image' && value.type !== 'graph') {
    throw new Error(`Collection item ${index + 1} has an unsupported type.`);
  }

  const item: CollectionItem = {
    id: requirePositiveInteger(value.id, `Collection item ${index + 1} id`),
    type: value.type,
  };

  copyOptionalPositiveInteger(value, item, 'item_part');
  copyOptionalPositiveInteger(value, item, 'item_image');
  copyOptionalString(value, item, 'image_iiif');
  copyOptionalString(value, item, 'coordinates');
  copyOptionalAnnotationType(value, item);
  copyOptionalString(value, item, 'allograph');
  copyOptionalString(value, item, 'character');
  copyOptionalString(value, item, 'character_type');
  copyOptionalString(value, item, 'hand_name');
  copyOptionalString(value, item, 'shelfmark');
  copyOptionalString(value, item, 'locus');
  copyOptionalString(value, item, 'repository_name');
  copyOptionalString(value, item, 'repository_city');
  copyOptionalString(value, item, 'date');

  return item;
}

function sanitizePortableItems(value: unknown): CollectionItem[] {
  if (!Array.isArray(value)) {
    throw new Error('Collection items must be an array.');
  }

  const seen = new Set<string>();

  return value.map((rawItem, index) => {
    const item = toPortableCollectionItem(rawItem, index);
    const key = `${item.type}:${item.id}`;

    if (seen.has(key)) {
      throw new Error(`Collection item ${index + 1} duplicates ${key}.`);
    }

    seen.add(key);
    return item;
  });
}

export function createPortableCollectionFile(collection: NamedCollection): PortableCollectionFile {
  const name = normalizeCollectionName(collection.name);
  if (!name) {
    throw new Error('Collection name is required.');
  }

  return {
    schema: PORTABLE_COLLECTION_SCHEMA,
    version: PORTABLE_COLLECTION_VERSION,
    collection: {
      name,
      items: sanitizePortableItems(collection.items),
    },
  };
}

export function parsePortableCollectionFile(raw: string): PortableCollectionFile['collection'] {
  if (getPortableFileSize(raw) > MAX_PORTABLE_COLLECTION_BYTES) {
    throw new Error('Collection file is larger than 5 MB.');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('Collection file is not valid JSON.');
  }

  if (!isRecord(parsed) || parsed.schema !== PORTABLE_COLLECTION_SCHEMA) {
    throw new Error('Collection file has an unsupported schema.');
  }

  if (parsed.version !== PORTABLE_COLLECTION_VERSION) {
    throw new Error('Collection file has an unsupported version.');
  }

  if (!isRecord(parsed.collection)) {
    throw new Error('Collection file is missing collection data.');
  }

  if (typeof parsed.collection.name !== 'string') {
    throw new Error('Collection name is required.');
  }

  const name = normalizeCollectionName(parsed.collection.name);
  if (!name) {
    throw new Error('Collection name is required.');
  }

  return {
    name,
    items: sanitizePortableItems(parsed.collection.items),
  };
}

export function getPortableCollectionFilename(name: string): string {
  const slug =
    normalizeCollectionName(name)
      .toLocaleLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'collection';

  return `${slug}.archetype-collection.json`;
}
