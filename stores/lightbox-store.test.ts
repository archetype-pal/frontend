import { beforeEach, describe, expect, it } from 'vitest';

import type { LightboxImage } from '@/lib/lightbox-db';
import { useLightboxStore } from './lightbox-store';

function image(id: string, zIndex: number): LightboxImage {
  return {
    id,
    originalId: 1,
    type: 'image',
    imageUrl: `https://example.test/${id}`,
    metadata: {},
    workspaceId: 'ws',
    position: { x: 0, y: 0, zIndex },
    size: { width: 100, height: 100 },
    transform: {
      opacity: 1,
      brightness: 100,
      contrast: 100,
      rotation: 0,
      flipX: false,
      flipY: false,
      grayscale: false,
    },
    createdAt: 0,
    updatedAt: 0,
  } as LightboxImage;
}

function zOrder(): Record<string, number> {
  const out: Record<string, number> = {};
  useLightboxStore.getState().images.forEach((img, id) => {
    out[id] = img.position.zIndex;
  });
  return out;
}

beforeEach(() => {
  useLightboxStore.setState({
    images: new Map([
      ['a', image('a', 1)],
      ['b', image('b', 5)],
      ['c', image('c', 9)],
    ]),
    history: [],
    // The real updateImage also writes the row to IndexedDB, which Node has no
    // window for; the swap under test only needs the in-memory half.
    updateImage: async (imageId, updates) => {
      useLightboxStore.setState((state) => {
        const images = new Map(state.images);
        images.set(imageId, { ...images.get(imageId)!, ...updates });
        return { images };
      });
    },
  });
});

describe('moveUp / moveDown', () => {
  it('moveUp swaps an image with the one directly above it', () => {
    useLightboxStore.getState().moveUp('a');
    expect(zOrder()).toEqual({ a: 5, b: 1, c: 9 });
  });

  it('moveDown swaps an image with the one directly below it', () => {
    useLightboxStore.getState().moveDown('c');
    expect(zOrder()).toEqual({ a: 1, b: 9, c: 5 });
  });

  it('leaves the stack alone at the top and at the bottom', () => {
    useLightboxStore.getState().moveUp('c');
    useLightboxStore.getState().moveDown('a');
    expect(zOrder()).toEqual({ a: 1, b: 5, c: 9 });
  });

  it('ignores an unknown image', () => {
    useLightboxStore.getState().moveUp('nope');
    expect(zOrder()).toEqual({ a: 1, b: 5, c: 9 });
  });
});
