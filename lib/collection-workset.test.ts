import { describe, expect, it } from 'vitest';

import { getPubliclyShareableCollectionItems } from './collection-workset';
import type { CollectionItem } from './collection-storage';

const imageItem: CollectionItem = {
  id: 10,
  type: 'image',
  image_iiif: 'https://example.test/image',
  shelfmark: 'Cotton Ch. xviii.2',
  locus: 'face',
  repository_name: 'British Library',
  internal_only: 'do not publish',
};

const graphItem: CollectionItem = {
  id: 20,
  type: 'graph',
  image_iiif: 'https://example.test/graph',
  coordinates: '{"type":"Feature"}',
  annotation_type: 'image',
  allograph: 'b, Caroline minuscule',
  hand_name: 'Hand A',
  shelfmark: 'Cotton Ch. xviii.2',
  locus: 'face',
  repository_name: 'British Library',
};

const editorialItem: CollectionItem = {
  id: 30,
  type: 'graph',
  annotation_type: 'editorial',
  image_iiif: 'https://example.test/editorial',
};

describe('getPubliclyShareableCollectionItems', () => {
  it('excludes editorial annotations and strips fields outside the public snapshot allowlist', () => {
    expect(getPubliclyShareableCollectionItems([imageItem, editorialItem])).toEqual([
      expect.objectContaining({ id: 10, type: 'image', shelfmark: 'Cotton Ch. xviii.2' }),
    ]);
    expect(getPubliclyShareableCollectionItems([imageItem])[0]).not.toHaveProperty('internal_only');
  });

  it('retains public graph labels used by collection views', () => {
    expect(getPubliclyShareableCollectionItems([graphItem])[0]).toMatchObject({
      allograph: 'b, Caroline minuscule',
      hand_name: 'Hand A',
    });
  });
});
