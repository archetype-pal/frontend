const IIIF_IMAGE_3_CONTEXT = 'http://iiif.io/api/image/3/context.json';

type ImagePyramidLevel = {
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

function imageSize(value: unknown): { width: number; height: number } | null {
  if (!value || typeof value !== 'object') return null;

  const { width, height } = value as { width?: unknown; height?: unknown };
  return typeof width === 'number' && typeof height === 'number' ? { width, height } : null;
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

  if (!isIiif3ImageService(source) || hasTileDescriptors(source.tiles)) {
    return source;
  }

  const levels = buildLegacyPyramidLevels(source, proxiedBaseUrl);
  return levels.length > 0 ? { type: 'legacy-image-pyramid', levels } : source;
}
