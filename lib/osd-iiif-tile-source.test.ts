import { describe, expect, it, vi } from 'vitest';

import { buildOpenSeadragonTileSource } from './osd-iiif-tile-source';

const IIIF3_CONTEXT = 'http://iiif.io/api/image/3/context.json';
const PROXIED_BASE_URL = '/iiif-proxy/4w108287_89_90_91_92p%2Fa80128_37.jp2';
const SIPI_V5_INFO = {
  '@context': IIIF3_CONTEXT,
  id: 'http://localhost:1024/4w108287_89_90_91_92p/a80128_37.jp2',
  type: 'ImageService3',
  profile: 'level2',
  width: 5468,
  height: 6471,
  sizes: [
    { width: 2734, height: 3236 },
    { width: 1367, height: 1618 },
    { width: 684, height: 809 },
    { width: 342, height: 405 },
  ],
  extraFeatures: ['sizeByWh'],
};

type IiifTileSource = {
  version: number;
  maxLevel: number;
  getTileWidth: (level: number) => number;
  getNumTiles: (level: number) => { x: number; y: number };
  getTileUrl: (level: number, x: number, y: number) => string;
};

type OpenSeadragonIiifApi = {
  LegacyTileSource: {
    new (options: Record<string, unknown>): IiifTileSource;
    prototype: {
      configure: (
        data: Record<string, unknown>,
        url: string,
        postData: string | null
      ) => Record<string, unknown>;
    };
  };
};

describe('buildOpenSeadragonTileSource', () => {
  it('uses SIPI sizes as a full-image pyramid when IIIF 3 descriptors omit tiles', () => {
    const source = buildOpenSeadragonTileSource(SIPI_V5_INFO, PROXIED_BASE_URL);

    expect(source).toEqual({
      type: 'legacy-image-pyramid',
      levels: [
        {
          url: `${PROXIED_BASE_URL}/full/342,405/0/default.jpg`,
          width: 342,
          height: 405,
        },
        {
          url: `${PROXIED_BASE_URL}/full/684,809/0/default.jpg`,
          width: 684,
          height: 809,
        },
        {
          url: `${PROXIED_BASE_URL}/full/1367,1618/0/default.jpg`,
          width: 1367,
          height: 1618,
        },
        {
          url: `${PROXIED_BASE_URL}/full/2734,3236/0/default.jpg`,
          width: 2734,
          height: 3236,
        },
        {
          url: `${PROXIED_BASE_URL}/full/5468,6471/0/default.jpg`,
          width: 5468,
          height: 6471,
        },
      ],
    });
  });

  it('makes OpenSeadragon use one full-page image per zoom level', async () => {
    const getContextSpy = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    try {
      const OpenSeadragon = (await import('openseadragon'))
        .default as unknown as OpenSeadragonIiifApi;
      const source = buildOpenSeadragonTileSource(SIPI_V5_INFO, PROXIED_BASE_URL);
      const configured = OpenSeadragon.LegacyTileSource.prototype.configure(
        source,
        `${PROXIED_BASE_URL}/info.json`,
        null
      );
      const tileSource = new OpenSeadragon.LegacyTileSource(configured);

      expect(tileSource.maxLevel).toBe(4);
      expect(tileSource.getTileUrl(0, 0, 0)).toBe(`${PROXIED_BASE_URL}/full/342,405/0/default.jpg`);
      expect(tileSource.getTileUrl(tileSource.maxLevel, 0, 0)).toBe(
        `${PROXIED_BASE_URL}/full/5468,6471/0/default.jpg`
      );
      expect(tileSource.getNumTiles(0)).toMatchObject({ x: 1, y: 1 });
      expect(tileSource.getNumTiles(tileSource.maxLevel)).toMatchObject({ x: 1, y: 1 });
      expect(tileSource.getTileUrl(0, 0, 0)).not.toContain('/full/full/');
    } finally {
      getContextSpy.mockRestore();
    }
  });

  it('preserves server-provided tile descriptors', () => {
    const source = buildOpenSeadragonTileSource(
      {
        '@context': IIIF3_CONTEXT,
        id: 'http://localhost:1024/image.jp2',
        type: 'ImageService3',
        profile: 'level2',
        width: 1000,
        height: 1200,
        tiles: [{ width: 512, scaleFactors: [1, 2, 4] }],
      },
      '/iiif-proxy/image.jp2'
    );

    expect(source.tiles).toEqual([{ width: 512, scaleFactors: [1, 2, 4] }]);
  });

  it('does not add IIIF 3 fallback tiles to non-IIIF-3 descriptors', () => {
    const source = buildOpenSeadragonTileSource(
      {
        '@context': 'http://iiif.io/api/image/2/context.json',
        '@id': 'http://localhost:1024/image.jp2',
        protocol: 'http://iiif.io/api/image',
        profile: ['http://iiif.io/api/image/2/level2.json'],
        width: 1000,
        height: 1200,
      },
      '/iiif-proxy/image.jp2'
    );

    expect(source.tiles).toBeUndefined();
  });
});
