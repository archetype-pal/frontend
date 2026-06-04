import { describe, expect, it, vi } from 'vitest';

vi.mock('@/utils/iiif', () => ({
  coordinatesFromGeoJson: vi.fn(() => ({ x: 1, y: 2, w: 30, h: 15 })),
  fetchIiifImageInfo: vi.fn(async () => ({ width: 1200, height: 600 })),
  getIiifImageUrl: vi.fn((url: string, options?: { thumbnail?: boolean }) =>
    options?.thumbnail ? `${url}/thumbnail` : `${url}/image`
  ),
  getIiifImageUrlWithBounds: vi.fn(async (url: string, options?: { thumbnail?: boolean }) =>
    options?.thumbnail ? `${url}/graph-thumbnail` : `${url}/graph-image`
  ),
}));

import {
  buildCollectionWorksetPayload,
  getPubliclyShareableCollectionItems,
} from './collection-workset';
import type { CollectionItem, NamedCollection } from './collection-storage';

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

describe('buildCollectionWorksetPayload', () => {
  it('builds a read-only lightbox payload with an embedded collection snapshot', async () => {
    const collection: NamedCollection = {
      id: 'research',
      name: 'Research',
      items: [imageItem, graphItem, editorialItem],
    };

    const payload = await buildCollectionWorksetPayload(collection);

    expect(payload.schema_version).toBe(2);
    expect(payload.collection).toEqual({
      schema_version: 1,
      name: 'Research',
      items: getPubliclyShareableCollectionItems([imageItem, graphItem]),
    });
    expect(payload.images).toHaveLength(2);
    expect(payload.workspaces[0]?.images).toEqual(payload.images.map((image) => image.id));
    expect(payload.images[0]).toMatchObject({
      originalId: 10,
      type: 'image',
      imageUrl: 'https://example.test/image/image',
      thumbnailUrl: 'https://example.test/image/thumbnail',
      metadata: {
        item_type_label: 'Page image',
        manuscript_label: 'BL Cotton Ch. xviii.2: face',
      },
      size: { width: 400, height: 200 },
    });
    expect(payload.images[1]).toMatchObject({
      originalId: 20,
      type: 'graph',
      imageUrl: 'https://example.test/graph/graph-image',
      thumbnailUrl: 'https://example.test/graph/graph-thumbnail',
      metadata: {
        item_type_label: 'Allograph',
        manuscript_label: 'BL Cotton Ch. xviii.2: face',
        allograph: 'b, Caroline minuscule',
        hand_name: 'Hand A',
      },
      size: { width: 400, height: 200 },
    });
  });
});
