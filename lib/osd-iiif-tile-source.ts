const IIIF_IMAGE_3_CONTEXT = 'http://iiif.io/api/image/3/context.json';

export type ImagePyramidLevel = {
  url: string;
  width: number;
  height: number;
};

function hasIiif3Context(context: unknown): boolean {
  if (context === IIIF_IMAGE_3_CONTEXT) return true;

  return Array.isArray(context) && context.includes(IIIF_IMAGE_3_CONTEXT);
}

function isIiif3ImageService(info: Record<string, unknown>): boolean {
  return info.type === 'ImageService3' || hasIiif3Context(info['@context']);
}

function hasTileDescriptors(tiles: unknown): boolean {
  return Array.isArray(tiles) && tiles.length > 0;
}

function isPowerOfTwo(value: unknown): boolean {
  return (
    typeof value === 'number' && Number.isInteger(value) && value > 0 && (value & (value - 1)) === 0
  );
}

// OpenSeadragon's IIIFTileSource derives each zoom level's scale factor as
// 2^(maxLevel - level) (unchanged from OSD v2.x through at least v6.1.0), so it
// only tiles correctly when every advertised scaleFactor is itself a power of
// two. SIPI is free to advertise arbitrary integer scaleFactors per the IIIF
// Image API spec (e.g. [1, 2, 3]) — when it does, OSD derives the wrong
// maxLevel/tile geometry and only ever paints a fraction of the canvas. Treat
// that the same as "no tiles advertised" and fall back to the full-image
// pyramid built from `sizes`, which OSD tiles correctly regardless.
//
// Descriptors that offer only scaleFactor 1 are no pyramid at all, so they
// fall back too (see withReducedLevels).
function hasUsableTileDescriptors(tiles: unknown): boolean {
  if (!hasTileDescriptors(tiles)) return false;

  return (
    (tiles as unknown[]).every((descriptor) => {
      const scaleFactors = (descriptor as { scaleFactors?: unknown }).scaleFactors;
      return Array.isArray(scaleFactors) && scaleFactors.every(isPowerOfTwo);
    }) && tilesHaveReducedLevels(tiles)
  );
}

function tilesHaveReducedLevels(tiles: unknown): boolean {
  return (
    Array.isArray(tiles) &&
    tiles.some((descriptor) => {
      const scaleFactors = (descriptor as { scaleFactors?: unknown }).scaleFactors;
      return Array.isArray(scaleFactors) && scaleFactors.some((factor) => Number(factor) > 1);
    })
  );
}

function imageSize(value: unknown): { width: number; height: number } | null {
  if (!value || typeof value !== 'object') return null;

  const { width, height } = value as { width?: unknown; height?: unknown };
  return typeof width === 'number' && typeof height === 'number' ? { width, height } : null;
}

// Halving stops before a level's longer side drops below this many pixels, and
// at 1/16: our JP2s hold four reduced resolutions, so SIPI renders down to 1/16
// from those, but anything smaller means decoding the full image (8 s instead
// of 0.05 s on a 12967 px folio).
const MIN_LEVEL_SIDE = 128;
const MAX_SCALE_FACTOR = 16;

/**
 * SIPI 6.4.1 and later derive scaleFactors and sizes from the JP2's own tile
 * grid, so an untiled JP2 (as ours are) advertises a single level: one tile the
 * size of the image, at full resolution. A viewer fed that has nothing to paint
 * until it has fetched and decoded the whole image. SIPI still renders any size,
 * so when info.json offers no reduced level this adds halvings, as SIPI v5 did:
 * as `sizes`, and as power-of-two scaleFactors on its tiles.
 */
export function withReducedLevels(info: Record<string, unknown>): Record<string, unknown> {
  const full = imageSize(info);
  if (!full || !isIiif3ImageService(info) || tilesHaveReducedLevels(info.tiles)) return info;
  const sizes = Array.isArray(info.sizes) ? info.sizes.map(imageSize) : [];
  if (sizes.some((size) => size && size.width < full.width)) return info;

  const reduced: { width: number; height: number }[] = [];
  for (
    let factor = 2;
    factor <= MAX_SCALE_FACTOR && Math.max(full.width, full.height) / factor >= MIN_LEVEL_SIDE;
    factor *= 2
  ) {
    reduced.push({
      width: Math.ceil(full.width / factor),
      height: Math.ceil(full.height / factor),
    });
  }
  if (reduced.length === 0) return info;

  const scaleFactors = [1, ...reduced.map((_, index) => 2 ** (index + 1))];
  return {
    ...info,
    sizes: reduced,
    ...(hasTileDescriptors(info.tiles) && {
      tiles: (info.tiles as Record<string, unknown>[]).map((tile) => ({ ...tile, scaleFactors })),
    }),
  };
}

function buildLegacyPyramidLevels(
  info: Record<string, unknown>,
  proxiedBaseUrl: string
): ImagePyramidLevel[] {
  const fullSize = imageSize(info);
  const sizes = Array.isArray(info.sizes) ? info.sizes.map(imageSize).filter((size) => size) : [];
  const levels = fullSize ? [...sizes, fullSize] : sizes;
  const uniqueLevels = new Map<string, ImagePyramidLevel>();

  levels.forEach((size) => {
    if (!size) return;
    uniqueLevels.set(`${size.width}x${size.height}`, {
      ...size,
      url: `${proxiedBaseUrl}/full/${size.width},${size.height}/0/default.jpg`,
    });
  });

  return Array.from(uniqueLevels.values()).sort((a, b) => a.width - b.width);
}

export function buildOpenSeadragonTileSource(
  info: Record<string, unknown>,
  proxiedBaseUrl: string
): Record<string, unknown> {
  const source: Record<string, unknown> = { ...info, id: proxiedBaseUrl, '@id': proxiedBaseUrl };

  if (!isIiif3ImageService(source) || hasUsableTileDescriptors(source.tiles)) {
    return source;
  }

  const levels = buildLegacyPyramidLevels(withReducedLevels(source), proxiedBaseUrl);
  return levels.length > 0 ? { type: 'legacy-image-pyramid', levels } : source;
}

export type LegacyPyramidTileSource = { minLevel: number; getClosestLevel: () => number };

/**
 * Builds OpenSeadragon's tile source for a full-image pyramid, with the smallest
 * level as its cutoff. OpenSeadragon takes the cutoff to be the highest level
 * that fits in one tile: it force-loads that level whenever the levels it wants
 * are not loaded yet (so on every open), and never evicts it from its cache. In
 * a full-image pyramid every level is one tile, so the cutoff was the
 * full-resolution image, fetched on every open (5.6 MB for a 12967 px folio)
 * although the home view needs a fraction of it.
 */
export function createFullImagePyramid<T extends LegacyPyramidTileSource>(
  LegacyTileSource: new (levels: ImagePyramidLevel[]) => T,
  levels: ImagePyramidLevel[]
): T {
  const source = new LegacyTileSource(levels);
  source.getClosestLevel = () => source.minLevel;
  return source;
}
