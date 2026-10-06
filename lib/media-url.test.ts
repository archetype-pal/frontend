import { describe, expect, it } from 'vitest';

import { getAnnotatedHitDetailUrl, getImageDetailUrl } from './media-url';

describe('getImageDetailUrl', () => {
  it('links an image hit by its own id under its item part', () => {
    expect(getImageDetailUrl({ id: 256, item_part: 895 })).toBe('/manuscripts/895/images/256');
  });

  it('prefers item_image over id', () => {
    expect(getImageDetailUrl({ id: 1, item_image: 256, item_part: 895 })).toBe(
      '/manuscripts/895/images/256'
    );
  });
});

describe('getAnnotatedHitDetailUrl', () => {
  it('opens the annotated image of a text-derived hit', () => {
    expect(getAnnotatedHitDetailUrl({ id: 12, item_image: 256, item_part: 895 })).toBe(
      '/manuscripts/895/images/256'
    );
  });

  it("never reads the hit's own id as an image or manuscript id (#142)", () => {
    // A text hit's id is a text id: falling back to it linked every such row
    // to /manuscripts/<textId>/images/<textId>, an unrelated record.
    expect(getAnnotatedHitDetailUrl({ id: 12, item_image: null, item_part: 895 })).toBeNull();
    expect(getAnnotatedHitDetailUrl({ id: 12, item_image: 256, item_part: null })).toBeNull();
    expect(getAnnotatedHitDetailUrl({ id: '12_p0', item_image: null, item_part: null })).toBeNull();
  });
});
