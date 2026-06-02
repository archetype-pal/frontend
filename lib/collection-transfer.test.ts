import { describe, expect, it } from 'vitest';

import {
  createPortableCollectionFile,
  getPortableCollectionFilename,
  parsePortableCollectionFile,
  PORTABLE_COLLECTION_SCHEMA,
  PORTABLE_COLLECTION_VERSION,
} from './collection-transfer';
import type { NamedCollection } from './collection-storage';

const collection: NamedCollection = {
  id: 'research',
  name: '  Research   notes  ',
  items: [
    {
      id: 10,
      type: 'image',
      item_part: 3,
      item_image: 10,
      image_iiif: 'https://example.test/image',
      shelfmark: 'NRS GD55/1',
      internal_only: 'do not transfer',
    },
    {
      id: 20,
      type: 'graph',
      item_part: 3,
      item_image: 10,
      image_iiif: 'https://example.test/image',
      coordinates: '{"type":"Feature"}',
      annotation_type: 'editorial',
      allograph: 'b, Caroline minuscule',
      hand_name: 'Hand A',
    },
  ],
};

describe('portable collection files', () => {
  it('round trips known collection fields, including editorial annotations', () => {
    const portable = createPortableCollectionFile(collection);
    const imported = parsePortableCollectionFile(JSON.stringify(portable));

    expect(portable).toMatchObject({
      schema: PORTABLE_COLLECTION_SCHEMA,
      version: PORTABLE_COLLECTION_VERSION,
      collection: {
        name: 'Research notes',
      },
    });
    expect(imported).toEqual(portable.collection);
    expect(imported.items[1]).toMatchObject({
      id: 20,
      type: 'graph',
      annotation_type: 'editorial',
      allograph: 'b, Caroline minuscule',
      hand_name: 'Hand A',
    });
  });

  it('strips fields outside the portable allowlist', () => {
    const portable = createPortableCollectionFile(collection);

    expect(portable.collection.items[0]).not.toHaveProperty('internal_only');
  });

  it('rejects unsupported schemas, versions, and duplicate items', () => {
    const portable = createPortableCollectionFile(collection);

    expect(() =>
      parsePortableCollectionFile(JSON.stringify({ ...portable, schema: 'example.collection' }))
    ).toThrow('unsupported schema');
    expect(() => parsePortableCollectionFile(JSON.stringify({ ...portable, version: 2 }))).toThrow(
      'unsupported version'
    );
    expect(() =>
      parsePortableCollectionFile(
        JSON.stringify({
          ...portable,
          collection: {
            ...portable.collection,
            items: [portable.collection.items[0], portable.collection.items[0]],
          },
        })
      )
    ).toThrow('duplicates image:10');
  });

  it('rejects invalid JSON and malformed items', () => {
    const portable = createPortableCollectionFile(collection);

    expect(() => parsePortableCollectionFile('{')).toThrow('not valid JSON');
    expect(() =>
      parsePortableCollectionFile(
        JSON.stringify({
          ...portable,
          collection: {
            ...portable.collection,
            items: [{ id: '10', type: 'image' }],
          },
        })
      )
    ).toThrow('must be a positive integer');
  });

  it('creates a portable JSON filename from the collection name', () => {
    expect(getPortableCollectionFilename('  Research Notes 2026  ')).toBe(
      'research-notes-2026.archetype-collection.json'
    );
    expect(getPortableCollectionFilename('Συλλογή')).toBe('collection.archetype-collection.json');
  });
});
