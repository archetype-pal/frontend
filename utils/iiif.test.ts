import { afterEach, describe, expect, it, vi } from 'vitest';

import { getIiifImageUrl, getIiifImageUrlWithBounds, iiifThumbFromSelector } from './iiif';

const BASE_URL = 'http://localhost:1024/4w108287_89_90_91_92p%2Fa80128_37.jp2';
const INFO_URL = `${BASE_URL}/info.json`;
const BOUNDS = { width: 5468, height: 6471 };

describe('IIIF URL generation', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('keeps full-image max-size URLs on the requested best-fit dimensions', () => {
    expect(getIiifImageUrl(INFO_URL, { maxSize: 1200 })).toBe(
      `${BASE_URL}/full/!1200,1200/0/default.jpg`
    );
  });

  it('does not request cropped max-size URLs larger than the crop', () => {
    expect(
      getIiifImageUrl(INFO_URL, {
        coordinates: { x: 480, y: 608, w: 229, h: 290 },
        maxSize: 1200,
      })
    ).toBe(`${BASE_URL}/480,608,229,290/!229,290/0/default.jpg`);
  });

  it('keeps cropped max-size bounds when the crop is larger than the requested size', () => {
    expect(
      getIiifImageUrl(INFO_URL, {
        coordinates: { x: 100, y: 200, w: 2000, h: 3000 },
        maxSize: 1200,
      })
    ).toBe(`${BASE_URL}/100,200,2000,3000/!1200,1200/0/default.jpg`);
  });

  it('preserves the current cropped thumbnail URL behavior after the revert', () => {
    expect(
      getIiifImageUrl(INFO_URL, {
        coordinates: { x: 480, y: 608, w: 229, h: 290 },
        thumbnail: true,
      })
    ).toBe(`${BASE_URL}/480,608,229,290/max/0/default.jpg`);
  });

  it('does not request upscaled bounded crop URLs after Y flip', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        return new Response(JSON.stringify(BOUNDS), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      })
    );

    await expect(
      getIiifImageUrlWithBounds(INFO_URL, {
        coordinates: { x: 480, y: 5573, w: 229, h: 290 },
        flipY: true,
        maxSize: 1200,
      })
    ).resolves.toBe(`${BASE_URL}/480,608,229,290/!229,290/0/default.jpg`);
  });

  it('keeps selector thumbnails on the reverted pixel-region URL shape', () => {
    expect(iiifThumbFromSelector(BASE_URL, 'xywh=pixel:480,608,229,290', 200)).toBe(
      `${BASE_URL}/480,608,229,290/200,/0/default.jpg`
    );
  });
});
