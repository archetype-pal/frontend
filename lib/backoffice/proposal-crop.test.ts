import { describe, expect, it } from 'vitest';

import { proposalCrop } from './proposal-crop';

const PAGE = { width: 1000, height: 2000 };

describe('proposalCrop', () => {
  it('flips the stored Y-up box to a top-left region', () => {
    // A 40×40 box whose lower edge sits 200px above the page's foot: in IIIF's
    // top-left space its top is 2000 - 200 - 40 = 1760.
    const crop = proposalCrop({ x: 500, y: 200, w: 40, h: 40 }, PAGE)!;

    // A 30px margin (0.75 × 40) on every side.
    expect(crop.region).toEqual({ x: 470, y: 1730, w: 100, h: 100 });
    expect(crop.box).toEqual({ left: 30, top: 30, width: 40, height: 40 });
  });

  it('does not mirror a box across the middle of the page', () => {
    const nearTop = proposalCrop({ x: 100, y: 1900, w: 20, h: 20 }, PAGE)!;
    const nearFoot = proposalCrop({ x: 100, y: 80, w: 20, h: 20 }, PAGE)!;

    expect(nearTop.region.y).toBeLessThan(100);
    expect(nearFoot.region.y).toBeGreaterThan(1850);
  });

  it('clamps the margin at the page edge and keeps the box where it is', () => {
    // Top-left corner of the page: no room for a margin above or to the left.
    const crop = proposalCrop({ x: 0, y: 1960, w: 40, h: 40 }, PAGE)!;

    expect(crop.region).toEqual({ x: 0, y: 0, w: 70, h: 70 });
    expect(crop.box.left).toBe(0);
    expect(crop.box.top).toBe(0);
    expect(crop.box.width).toBeCloseTo((40 / 70) * 100);
  });

  it('pads by the longer side, so a tall letter keeps its context', () => {
    const crop = proposalCrop({ x: 500, y: 1000, w: 10, h: 80 }, PAGE)!;

    expect(crop.region.w).toBe(10 + 2 * 60);
    expect(crop.region.h).toBe(80 + 2 * 60);
  });

  it.each([
    ['an empty box', { x: 10, y: 10, w: 0, h: 10 }, PAGE],
    ['a page of no size', { x: 10, y: 10, w: 10, h: 10 }, { width: 0, height: 0 }],
    ['a box wholly off the page', { x: 5000, y: 10, w: 10, h: 10 }, PAGE],
  ])('gives no crop for %s', (_label, bbox, page) => {
    expect(proposalCrop(bbox, page)).toBeNull();
  });
});
