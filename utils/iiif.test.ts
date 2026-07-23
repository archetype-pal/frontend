import { afterEach, describe, expect, it, vi } from 'vitest';

import { getIiifImageUrl, getIiifImageUrlWithBounds, iiifThumbFromSelector } from './iiif';

const BASE_URL = 'http://localhost:1024/4w108287_89_90_91_92p%2Fa80128_37.jp2';
// Absolute upstream URLs resolve to the same-origin /iiif-proxy rewrite so the
// browser never needs direct reachability to the IIIF host.
const PROXY_BASE = '/iiif-proxy/4w108287_89_90_91_92p%2Fa80128_37.jp2';
const INFO_URL = `${BASE_URL}/info.json`;
const BOUNDS = { width: 5468, height: 6471 };

describe('IIIF URL generation', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('drops an IIIF_HOST base path (nginx /sipi) instead of fusing it into the identifier', () => {
    // Production serves SIPI behind nginx at IIIF_HOST=https://domain/sipi;
    // the "/sipi" prefix is routing, not part of the SIPI identifier.
    expect(
      getIiifImageUrl('http://localhost/sipi/uploads%2Fitem-part-1%2Fa.jp2/info.json', {
        thumbnail: true,
      })
    ).toBe('/iiif-proxy/uploads%2Fitem-part-1%2Fa.jp2/full/300,/0/default.jpg');
  });

  it('keeps full-image max-size URLs on the requested best-fit dimensions', () => {
    expect(getIiifImageUrl(INFO_URL, { maxSize: 1200 })).toBe(
      `${PROXY_BASE}/full/!1200,1200/0/default.jpg`
    );
  });

  it('does not request cropped max-size URLs larger than the crop', () => {
    expect(
      getIiifImageUrl(INFO_URL, {
        coordinates: { x: 480, y: 608, w: 229, h: 290 },
        maxSize: 1200,
      })
    ).toBe(`${PROXY_BASE}/480,608,229,290/!229,290/0/default.jpg`);
  });

  it('keeps cropped max-size bounds when the crop is larger than the requested size', () => {
    expect(
      getIiifImageUrl(INFO_URL, {
        coordinates: { x: 100, y: 200, w: 2000, h: 3000 },
        maxSize: 1200,
      })
    ).toBe(`${PROXY_BASE}/100,200,2000,3000/!1200,1200/0/default.jpg`);
  });

  it('preserves the current cropped thumbnail URL behavior after the revert', () => {
    expect(
      getIiifImageUrl(INFO_URL, {
        coordinates: { x: 480, y: 608, w: 229, h: 290 },
        thumbnail: true,
      })
    ).toBe(`${PROXY_BASE}/480,608,229,290/max/0/default.jpg`);
  });

  it('honors compact thumbnail size requests for cropped thumbnails', () => {
    expect(
      getIiifImageUrl(INFO_URL, {
        coordinates: { x: 480, y: 608, w: 229, h: 290 },
        thumbnail: true,
        maxSize: 120,
      })
    ).toBe(`${PROXY_BASE}/480,608,229,290/120,/0/default.jpg`);
  });

  it('does not upscale cropped thumbnails smaller than the requested thumbnail size', () => {
    expect(
      getIiifImageUrl(INFO_URL, {
        coordinates: { x: 1855, y: 1037, w: 61, h: 75 },
        thumbnail: true,
        maxSize: 120,
      })
    ).toBe(`${PROXY_BASE}/1855,1037,61,75/max/0/default.jpg`);
  });

  it('honors compact thumbnail size requests for full-image thumbnails', () => {
    expect(getIiifImageUrl(INFO_URL, { thumbnail: true, maxSize: 120 })).toBe(
      `${PROXY_BASE}/full/120,/0/default.jpg`
    );
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
    ).resolves.toBe(`${PROXY_BASE}/480,608,229,290/!229,290/0/default.jpg`);
  });

  it('honors compact thumbnail size requests after Y flip', async () => {
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
        maxSize: 120,
      })
    ).resolves.toBe(`${PROXY_BASE}/480,608,229,290/120,/0/default.jpg`);
  });

  it('keeps selector thumbnails on the reverted pixel-region URL shape', () => {
    expect(iiifThumbFromSelector(BASE_URL, 'xywh=pixel:480,608,229,290', 200)).toBe(
      `${PROXY_BASE}/480,608,229,290/200,/0/default.jpg`
    );
  });
});
