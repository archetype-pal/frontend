import {
  createPortableCollectionFile,
  parsePortableCollectionFile,
  PORTABLE_COLLECTION_SCHEMA,
  PORTABLE_COLLECTION_VERSION,
} from './collection-transfer';
import type { CollectionItem, NamedCollection } from './collection-storage';
import { getPubliclyShareableCollectionItems } from './collection-workset';

export const COLLECTION_SHARE_QUERY_PARAM = 'collection';

const COMPACT_COLLECTION_SHARE_SCHEMA = 'acs';
const COMPACT_COLLECTION_SHARE_VERSION = 1;

type CompactCollectionShareItem = {
  i: number;
  t: 'i' | 'g';
  p?: number | null;
  m?: number | null;
  u?: string;
  x?: string;
  k?: string | null;
  a?: string;
  ch?: string;
  ct?: string;
  h?: string;
  s?: string;
  l?: string;
  r?: string;
  c?: string;
  d?: string;
};

type CompactCollectionSharePayload = {
  s: typeof COMPACT_COLLECTION_SHARE_SCHEMA;
  v: typeof COMPACT_COLLECTION_SHARE_VERSION;
  n: string;
  i: CompactCollectionShareItem[];
};

function getCollectionPageUrl(siteUrl: string): string {
  return `${siteUrl.replace(/\/$/, '')}/collection`;
}

function encodeSharePayload(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function decodeSharePayload(value: string): string {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function compactItem(item: CollectionItem): CompactCollectionShareItem {
  return {
    i: item.id,
    t: item.type === 'image' ? 'i' : 'g',
    p: item.item_part,
    m: item.item_image,
    u: item.image_iiif,
    x: item.coordinates,
    k: item.annotation_type,
    a: item.allograph,
    ch: item.character,
    ct: item.character_type,
    h: item.hand_name,
    s: item.shelfmark,
    l: item.locus,
    r: item.repository_name,
    c: item.repository_city,
    d: item.date,
  };
}

function collectionItemFromCompact(value: unknown): CollectionItem {
  if (!isRecord(value)) {
    throw new Error('Collection share item must be an object.');
  }
  if (value.t !== 'i' && value.t !== 'g') {
    throw new Error('Collection share item has an unsupported type.');
  }

  return {
    id: value.i as number,
    type: value.t === 'i' ? 'image' : 'graph',
    item_part: value.p as number | null | undefined,
    item_image: value.m as number | null | undefined,
    image_iiif: value.u as string | undefined,
    coordinates: value.x as string | undefined,
    annotation_type: value.k as string | null | undefined,
    allograph: value.a as string | undefined,
    character: value.ch as string | undefined,
    character_type: value.ct as string | undefined,
    hand_name: value.h as string | undefined,
    shelfmark: value.s as string | undefined,
    locus: value.l as string | undefined,
    repository_name: value.r as string | undefined,
    repository_city: value.c as string | undefined,
    date: value.d as string | undefined,
  };
}

function createCompactCollectionSharePayload(collection: NamedCollection) {
  const portable = createPortableCollectionFile(collection);

  return {
    s: COMPACT_COLLECTION_SHARE_SCHEMA,
    v: COMPACT_COLLECTION_SHARE_VERSION,
    n: portable.collection.name,
    i: portable.collection.items.map(compactItem),
  } satisfies CompactCollectionSharePayload;
}

function parseCompactCollectionSharePayload(raw: string) {
  const parsed = JSON.parse(raw) as unknown;
  if (
    !isRecord(parsed) ||
    parsed.s !== COMPACT_COLLECTION_SHARE_SCHEMA ||
    parsed.v !== COMPACT_COLLECTION_SHARE_VERSION ||
    typeof parsed.n !== 'string' ||
    !Array.isArray(parsed.i)
  ) {
    throw new Error('Collection share payload has an unsupported schema.');
  }

  const portablePayload = {
    schema: PORTABLE_COLLECTION_SCHEMA,
    version: PORTABLE_COLLECTION_VERSION,
    collection: {
      name: parsed.n,
      items: parsed.i.map(collectionItemFromCompact),
    },
  };

  return parsePortableCollectionFile(JSON.stringify(portablePayload));
}

function parseSharePayload(raw: string): ReturnType<typeof parsePortableCollectionFile> {
  try {
    return parseCompactCollectionSharePayload(raw);
  } catch {
    return parsePortableCollectionFile(raw);
  }
}

export function createAnonymousCollectionShareUrl(
  collection: NamedCollection,
  siteUrl: string
): string {
  const shareableCollection: NamedCollection = {
    ...collection,
    items: getPubliclyShareableCollectionItems(collection.items),
  };
  const payload = createCompactCollectionSharePayload(shareableCollection);
  const encodedPayload = encodeSharePayload(JSON.stringify(payload));
  return `${getCollectionPageUrl(siteUrl)}#${COLLECTION_SHARE_QUERY_PARAM}=${encodedPayload}`;
}

export function parseAnonymousCollectionShareParam(value: string): NamedCollection {
  let parsed: ReturnType<typeof parsePortableCollectionFile>;

  try {
    parsed = parseSharePayload(value);
  } catch {
    parsed = parseSharePayload(decodeSharePayload(value));
  }

  return {
    id: 'anonymous-share',
    name: parsed.name,
    items: getPubliclyShareableCollectionItems(parsed.items),
  };
}
