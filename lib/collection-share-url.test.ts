import { describe, expect, it } from 'vitest';

import {
  COLLECTION_SHARE_QUERY_PARAM,
  createAnonymousCollectionShareUrl,
  parseAnonymousCollectionShareParam,
} from './collection-share-url';
import { createPortableCollectionFile } from './collection-transfer';
import type { NamedCollection } from './collection-storage';

const collection: NamedCollection = {
  id: 'research',
  name: 'Research notes',
  items: [
    {
      id: 10,
      type: 'image',
      item_part: 3,
      item_image: 10,
      image_iiif: 'https://example.test/image',
      shelfmark: 'NRS GD55/1',
      repository_name: 'National Records of Scotland',
    },
    {
      id: 20,
      type: 'graph',
      item_part: 3,
      item_image: 10,
      image_iiif: 'https://example.test/image',
      coordinates: '{"type":"Feature"}',
      annotation_type: 'image',
      allograph: 'b, Caroline minuscule',
      hand_name: 'Hand A',
    },
    {
      id: 30,
      type: 'graph',
      annotation_type: 'editorial',
      image_iiif: 'https://example.test/editorial',
    },
  ],
};

function encodePayload(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function decodePayload(value: string): string {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function getShareParam(url: string): string {
  return (
    new URLSearchParams(new URL(url).hash.replace(/^#/, '')).get(COLLECTION_SHARE_QUERY_PARAM) ?? ''
  );
}

describe('anonymous collection share URLs', () => {
  it('creates compact public collection links and excludes editorial items', () => {
    const url = createAnonymousCollectionShareUrl(collection, 'https://example.test/');
    const shareParam = getShareParam(url);
    const decodedPayload = JSON.parse(decodePayload(shareParam)) as Record<string, unknown>;

    expect(url.startsWith('https://example.test/collection#collection=')).toBe(true);
    expect(decodedPayload).toMatchObject({ s: 'acs', v: 1, n: 'Research notes' });
    expect(JSON.stringify(decodedPayload)).not.toContain('repository_name');

    const parsed = parseAnonymousCollectionShareParam(shareParam);

    expect(parsed).toMatchObject({
      id: 'anonymous-share',
      name: 'Research notes',
    });
    expect(parsed.items).toHaveLength(2);
    expect(parsed.items[1]).toMatchObject({
      id: 20,
      type: 'graph',
      allograph: 'b, Caroline minuscule',
      hand_name: 'Hand A',
    });
    expect(parsed.items.some((item) => item.annotation_type === 'editorial')).toBe(false);
  });

  it('keeps parsing older portable share payloads', () => {
    const portable = createPortableCollectionFile(collection);
    const portableJson = JSON.stringify(portable);

    expect(parseAnonymousCollectionShareParam(portableJson).name).toBe('Research notes');
    expect(parseAnonymousCollectionShareParam(encodePayload(portableJson)).name).toBe(
      'Research notes'
    );
  });
});
