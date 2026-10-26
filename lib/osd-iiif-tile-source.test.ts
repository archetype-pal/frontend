/** @vitest-environment jsdom */
import { describe, expect, it, vi } from 'vitest';

import {
  buildOpenSeadragonTileSource,
  createFullImagePyramid,
  type ImagePyramidLevel,
  withReducedLevels,
} from './osd-iiif-tile-source';

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
// SIPI 6.4.1+ on an untiled JP2: one whole-image tile, full resolution only.
const SIPI_V10_INFO = {
  ...SIPI_V5_INFO,
  sizes: [{ width: 5468, height: 6471 }],
  tiles: [{ width: 5468, height: 6471, scaleFactors: [1] }],
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

  it("makes the smallest level OpenSeadragon's cutoff, so opening does not fetch full resolution", async () => {
    const getContextSpy = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    try {
      const OpenSeadragon = (await import('openseadragon'))
        .default as unknown as OpenSeadragonIiifApi;
      const source = buildOpenSeadragonTileSource(SIPI_V5_INFO, PROXIED_BASE_URL);
      const tileSource = createFullImagePyramid(
        OpenSeadragon.LegacyTileSource as unknown as new (levels: ImagePyramidLevel[]) => {
          minLevel: number;
          maxLevel: number;
          getClosestLevel: () => number;
        },
        source.levels as ImagePyramidLevel[]
      );

      // Every level is one tile, so OpenSeadragon's own choice is the top one.
      expect(tileSource.maxLevel).toBe(4);
      expect(tileSource.getClosestLevel()).toBe(0);
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

  it('falls back to a full-image pyramid when scaleFactors are not powers of two', () => {
    // Matches SIPI v6.3.1's actual info.json shape for these images: a single
    // tiles descriptor advertising scaleFactors [1, 2, 3]. OpenSeadragon's
    // IIIFTileSource only tiles correctly when every scaleFactor is a power of
    // two (it derives level geometry as 2^(maxLevel - level)), so 3 breaks its
    // tile-pyramid math and it only ever paints part of the canvas.
    const source = buildOpenSeadragonTileSource(
      {
        ...SIPI_V5_INFO,
        tiles: [{ width: 512, height: 512, scaleFactors: [1, 2, 3] }],
      },
      PROXIED_BASE_URL
    );

    expect(source.type).toBe('legacy-image-pyramid');
    expect(source.tiles).toBeUndefined();
  });

  it('preserves tile descriptors whose scaleFactors are all powers of two', () => {
    const source = buildOpenSeadragonTileSource(
      {
        ...SIPI_V5_INFO,
        tiles: [{ width: 512, scaleFactors: [1, 2, 4, 8] }],
      },
      PROXIED_BASE_URL
    );

    expect(source.tiles).toEqual([{ width: 512, scaleFactors: [1, 2, 4, 8] }]);
  });

  it('builds the reduced levels itself when SIPI offers only full resolution', () => {
    const source = buildOpenSeadragonTileSource(SIPI_V10_INFO, PROXIED_BASE_URL);

    expect(source.type).toBe('legacy-image-pyramid');
    expect(
      (source.levels as { width: number; height: number }[]).map((l) => [l.width, l.height])
    ).toEqual([
      [342, 405],
      [684, 809],
      [1367, 1618],
      [2734, 3236],
      [5468, 6471],
    ]);
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

describe('withReducedLevels', () => {
  it('adds halvings and power-of-two scaleFactors when SIPI offers only full resolution', () => {
    const info = withReducedLevels(SIPI_V10_INFO);

    expect(info.tiles).toEqual([{ width: 5468, height: 6471, scaleFactors: [1, 2, 4, 8, 16] }]);
    expect(info.sizes).toEqual([
      { width: 2734, height: 3236 },
      { width: 1367, height: 1618 },
      { width: 684, height: 809 },
      { width: 342, height: 405 },
    ]);
  });

  it('leaves an info.json that already offers reduced levels as it is', () => {
    expect(withReducedLevels(SIPI_V5_INFO)).toBe(SIPI_V5_INFO);
    const tiled = { ...SIPI_V10_INFO, tiles: [{ width: 512, scaleFactors: [1, 2, 4] }] };
    expect(withReducedLevels(tiled)).toBe(tiled);
  });

  it('leaves an image too small to halve as it is', () => {
    const small = {
      ...SIPI_V10_INFO,
      width: 200,
      height: 120,
      sizes: [{ width: 200, height: 120 }],
      tiles: [{ width: 200, height: 120, scaleFactors: [1] }],
    };
    expect(withReducedLevels(small)).toBe(small);
  });
});
