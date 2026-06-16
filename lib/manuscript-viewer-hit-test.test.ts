import { describe, expect, it } from 'vitest';

import { smallestBoxContainingPoint, type HitBox } from './manuscript-viewer-hit-test';

const box = (id: string, left: number, top: number, width: number, height: number): HitBox => ({
  id,
  left,
  top,
  right: left + width,
  bottom: top + height,
  width,
  height,
});

describe('smallestBoxContainingPoint', () => {
  it('returns null when no box contains the point', () => {
    expect(smallestBoxContainingPoint([box('a', 0, 0, 10, 10)], 50, 50)).toBeNull();
  });

  it('returns the only containing box', () => {
    expect(smallestBoxContainingPoint([box('a', 0, 0, 100, 100)], 50, 50)).toBe('a');
  });

  it('prefers the smallest box when several contain the point', () => {
    const region = box('region', 0, 0, 100, 100); // area 10000
    const glyph = box('glyph', 40, 40, 20, 20); // area 400, inside the region
    expect(smallestBoxContainingPoint([region, glyph], 50, 50)).toBe('glyph');
    // order-independent
    expect(smallestBoxContainingPoint([glyph, region], 50, 50)).toBe('glyph');
  });

  it('ignores zero-width boxes', () => {
    expect(smallestBoxContainingPoint([box('a', 50, 50, 0, 10)], 50, 55)).toBeNull();
  });

  it('ignores zero-height boxes (would otherwise win on area 0)', () => {
    expect(smallestBoxContainingPoint([box('a', 50, 50, 10, 0)], 55, 50)).toBeNull();
    // a degenerate zero-height box must not beat a real box containing the point
    const real = box('real', 0, 0, 100, 100);
    const degenerate = box('degenerate', 0, 0, 100, 0);
    expect(smallestBoxContainingPoint([degenerate, real], 50, 0)).toBe('real');
  });

  it('treats edges as inside (inclusive bounds)', () => {
    const b = box('a', 0, 0, 10, 10);
    expect(smallestBoxContainingPoint([b], 0, 0)).toBe('a');
    expect(smallestBoxContainingPoint([b], 10, 10)).toBe('a');
  });

  it('when candidates are pre-filtered to regions only, returns the region the click lands in', () => {
    // The component passes only text-region boxes here; the enclosing region
    // must win even though a glyph would be smaller, because the glyph was
    // filtered out before this call.
    const region = box('region', 0, 0, 100, 100);
    expect(smallestBoxContainingPoint([region], 50, 50)).toBe('region');
  });
});
