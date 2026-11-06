import { describe, expect, it } from 'vitest';

import {
  MIN_SIDE,
  annotationFromBox,
  boxFromAnnotation,
  dragBox,
  editorRegion,
  sameBox,
} from './proposal-box';

// A 40×20 box whose lower edge is 200px above the foot of a 1000×2000 page:
// its top is 1780px down from the top.
const STORED = {
  type: 'Feature',
  properties: {},
  geometry: {
    type: 'Polygon',
    coordinates: [
      [
        [500, 200],
        [540, 200],
        [540, 220],
        [500, 220],
        [500, 200],
      ],
    ],
  },
};
const PAGE = { width: 1000, height: 2000 };
const REGION = { x: 0, y: 0, w: 100, h: 100 };

describe('the stored box and the editor box', () => {
  it('flips the stored Y-up ring to a top-left box and back again', () => {
    const box = boxFromAnnotation(STORED, PAGE.height);

    expect(box).toEqual({ x: 500, y: 1780, w: 40, h: 20 });
    expect(annotationFromBox(box!, PAGE.height)).toEqual(STORED);
  });

  it('stores whole pixels, as hand-drawn boxes are', () => {
    const ring = annotationFromBox({ x: 10.4, y: 20.6, w: 5.2, h: 5.2 }, 100) as {
      geometry: { coordinates: number[][][] };
    };

    expect(ring.geometry.coordinates[0].flat().every(Number.isInteger)).toBe(true);
  });

  it('reads no box from something that is not a polygon', () => {
    expect(boxFromAnnotation({}, PAGE.height)).toBeNull();
  });

  it('shows the box with room round it, but not past the page', () => {
    expect(editorRegion({ x: 500, y: 1780, w: 40, h: 20 }, PAGE)).toEqual({
      x: 440,
      y: 1720,
      w: 160,
      h: 140,
    });
    expect(editorRegion({ x: 5, y: 5, w: 40, h: 20 }, PAGE)).toMatchObject({ x: 0, y: 0 });
  });

  it('compares boxes as they would be stored', () => {
    expect(sameBox({ x: 10, y: 10, w: 5, h: 5 }, { x: 10.2, y: 9.8, w: 5, h: 5.1 })).toBe(true);
    expect(sameBox({ x: 10, y: 10, w: 5, h: 5 }, { x: 11, y: 10, w: 5, h: 5 })).toBe(false);
  });
});

describe('dragBox', () => {
  const start = { x: 40, y: 40, w: 20, h: 20 };

  it('moves the box whole, and stops it at the edge of the region', () => {
    expect(dragBox(start, 'move', 5, -5, REGION)).toEqual({ x: 45, y: 35, w: 20, h: 20 });
    expect(dragBox(start, 'move', 500, -500, REGION)).toEqual({ x: 80, y: 0, w: 20, h: 20 });
  });

  it('moves only the edges a handle holds', () => {
    expect(dragBox(start, 'e', 10, 99, REGION)).toEqual({ x: 40, y: 40, w: 30, h: 20 });
    expect(dragBox(start, 'nw', -10, -5, REGION)).toEqual({ x: 30, y: 35, w: 30, h: 25 });
    expect(dragBox(start, 's', 0, 1000, REGION)).toEqual({ x: 40, y: 40, w: 20, h: 60 });
  });

  it('never turns the box inside out', () => {
    expect(dragBox(start, 'w', 100, 0, REGION)).toEqual({
      x: 60 - MIN_SIDE,
      y: 40,
      w: MIN_SIDE,
      h: 20,
    });
    expect(dragBox(start, 'n', 0, 100, REGION).h).toBe(MIN_SIDE);
  });
});
