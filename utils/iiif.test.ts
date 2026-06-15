import { afterEach, describe, expect, it, vi } from 'vitest';

import { getIiifImageUrl, getIiifImageUrlWithBounds, iiifThumbFromSelector } from './iiif';

const BASE_URL = 'http://localhost:1024/4w108287_89_90_91_92p%2Fa80128_37.jp2';
const INFO_URL = `${BASE_URL}/info.json`;
const BOUNDS = { width: 5468, height: 6471 };
const EXPECTED_PCT_REGION = 'pct:8.778,9.396,4.188,4.482';

describe('IIIF thumbnail URL generation', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('keeps full-image thumbnails on the old width-based IIIF size form', () => {
    expect(getIiifImageUrl(INFO_URL, { thumbnail: true })).toBe(
      `${BASE_URL}/full/300,/0/default.jpg`
    );
  });

  it('uses best-fit size for cropped thumbnails instead of max', () => {
    expect(
      getIiifImageUrl(INFO_URL, {
        coordinates: { x: 480, y: 608, w: 229, h: 290 },
        thumbnail: true,
        maxSize: 200,
      })
    ).toBe(`${BASE_URL}/480,608,229,290/!200,200/0/default.jpg`);
  });

  it('converts selector crops to percentage regions when image bounds are known', () => {
    expect(iiifThumbFromSelector(BASE_URL, 'xywh=pixel:480,608,229,290', 200, BOUNDS)).toBe(
      `${BASE_URL}/${EXPECTED_PCT_REGION}/!200,200/0/default.jpg`
    );
  });

  it('converts bounded GeoJSON crops to the same percentage region after Y flip', async () => {
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
        thumbnail: true,
        flipY: true,
        maxSize: 200,
      })
    ).resolves.toBe(`${BASE_URL}/${EXPECTED_PCT_REGION}/!200,200/0/default.jpg`);
  });

  it('clamps signed selector coordinates before building fallback pixel-region crops', () => {
    expect(iiifThumbFromSelector(BASE_URL, 'xywh=pixel:-10,-2,30,40', 200)).toBe(
      `${BASE_URL}/0,0,30,40/!200,200/0/default.jpg`
    );
  });
});
