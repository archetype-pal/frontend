import { createPortableCollectionFile, parsePortableCollectionFile } from './collection-transfer';
import type { NamedCollection } from './collection-storage';
import { getPubliclyShareableCollectionItems } from './collection-workset';

export const COLLECTION_SHARE_QUERY_PARAM = 'collection';

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

export function createAnonymousCollectionShareUrl(
  collection: NamedCollection,
  siteUrl: string
): string {
  const shareableCollection: NamedCollection = {
    ...collection,
    items: getPubliclyShareableCollectionItems(collection.items),
  };
  const payload = createPortableCollectionFile(shareableCollection);
  const encodedPayload = encodeSharePayload(JSON.stringify(payload));
  return `${getCollectionPageUrl(siteUrl)}#${COLLECTION_SHARE_QUERY_PARAM}=${encodedPayload}`;
}

export function parseAnonymousCollectionShareParam(value: string): NamedCollection {
  let parsed: ReturnType<typeof parsePortableCollectionFile>;

  try {
    parsed = parsePortableCollectionFile(value);
  } catch {
    parsed = parsePortableCollectionFile(decodeSharePayload(value));
  }

  return {
    id: 'anonymous-share',
    name: parsed.name,
    items: getPubliclyShareableCollectionItems(parsed.items),
  };
}
