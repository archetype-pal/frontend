/**
 * IIIF Image API 3.0 helpers: resolve info URLs, build image URLs, clamp regions.
 */

/** Region coordinates: x,y (top-left), w,h (width, height). */
export type IIIFCoordinates = { x: number; y: number; w: number; h: number };

/** Options for building a IIIF image URL from an info URL. */
export type IIIFImageUrlOptions = {
  coordinates?: IIIFCoordinates;
  thumbnail?: boolean;
  /** Flip Y from bottom-left origin (legacy GeoJSON) to top-left origin (IIIF). */
  flipY?: boolean;
  /** Max pixel dimension for the longer side. Uses IIIF `!w,h` (best fit) syntax. */
  maxSize?: number;
};

/** IIIF Image Information 2.x – width/height from info.json. */
export interface IIIFImageInfo {
  width: number;
  height: number;
}

// --- Internal constants and helpers (not exported) ---

const DEFAULT_THUMBNAIL_SIZE = 300;
const IIIF_PREFIX_LEN: Record<string, number> = { sipi: 2, iiif: 2 };
const IIIF_INFO_CACHE = new Map<string, IIIFImageInfo | null>();
const IIIF_INFO_INFLIGHT = new Map<string, Promise<IIIFImageInfo | null>>();

/**
 * Drop an IIIF-server base path (e.g. nginx serving SIPI under "/sipi") from
 * an absolute IIIF URL's pathname, keeping the identifier and everything after
 * it. SIPI itself never sees the base path, so it must not reach the
 * /iiif-proxy rewrite either. The identifier is the first segment containing
 * an encoded slash (%2F): media paths always live in a subfolder, while
 * base-path and IIIF parameter segments never contain %2F. Pathnames without
 * such a segment are returned unchanged (e.g. dev, where IIIF_HOST has no
 * base path).
 */
export function stripIiifBasePath(pathname: string): string {
  const segments = pathname.split('/').filter(Boolean);
  const idIdx = segments.findIndex((segment) => /%2f/i.test(segment));
  if (idIdx <= 0) return pathname;
  return '/' + segments.slice(idIdx).join('/');
}

function resolveInfoUrl(infoUrl: string): string {
  const trimmed = (infoUrl || '').trim();
  if (!trimmed) return trimmed;

  // Already proxy-relative — nothing to resolve.
  if (trimmed.startsWith('/iiif-proxy/')) return trimmed;

  // Django media URLs (absolute or relative) point to file storage, not the IIIF
  // server. Strip the media prefix and serve via the same-origin /iiif-proxy
  // rewrite (SIPI mounts the same storage directory).
  if (trimmed.startsWith('media/')) {
    return `/iiif-proxy/${trimmed.slice('media/'.length)}`;
  }
  const mediaIdx = trimmed.indexOf('/media/');
  if (mediaIdx !== -1 && /^https?:\/\//.test(trimmed)) {
    return `/iiif-proxy/${trimmed.slice(mediaIdx + '/media/'.length)}`;
  }

  // Absolute IIIF URLs (the backend hands out IIIF_HOST-based ones) also go
  // through the same-origin /iiif-proxy rewrite: the browser then only ever
  // talks to the frontend origin. The upstream host may not be reachable from
  // the browser at all (WSL port forwarding, containerized dev, proxied
  // deployments) — only the Next server needs to reach it.
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    try {
      const u = new URL(trimmed);
      // Keep pathname encoding intact — %2F must stay encoded for SIPI — and
      // drop any IIIF_HOST base path (e.g. "/sipi"): it's nginx routing, not
      // part of the identifier.
      return `/iiif-proxy${stripIiifBasePath(u.pathname)}${u.search}`;
    } catch {
      return trimmed;
    }
  }

  const apiBase =
    typeof process !== 'undefined'
      ? process.env?.NEXT_PUBLIC_API_URL?.trim()?.replace(/\/$/, '')
      : '';
  if (!apiBase) throw new Error('Missing required environment variable: NEXT_PUBLIC_API_URL');
  return `${apiBase}${trimmed.startsWith('/') ? '' : '/'}${trimmed}`;
}

function encodeIiifPathIdentifier(pathname: string): string {
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length <= 1) return pathname;
  const keep = IIIF_PREFIX_LEN[segments[0]] ?? 0;
  const prefixSegments = keep > 0 ? segments.slice(0, Math.min(keep, segments.length - 1)) : [];
  const identifier =
    prefixSegments.length > 0
      ? segments.slice(prefixSegments.length).join('/')
      : segments.join('/');
  const encodedIdentifier = identifier.replace(/\//g, '%2F');
  if (prefixSegments.length === 0) return '/' + encodedIdentifier;
  return '/' + prefixSegments.join('/') + '/' + encodedIdentifier;
}

function normalizeIiifBase(iiifBase: string): string {
  let cleaned = iiifBase.replace(/\/info\.json$/i, '').replace(/\/+$/, '');
  cleaned = cleaned.replace(
    /\/full\/[^/]+\/\d+\/(?:default|color|gray|bitonal)\.(?:jpg|png|gif|webp)$/i,
    ''
  );

  try {
    const u = new URL(cleaned);

    // IMPORTANT: do NOT decode here; decoding would turn %2F into "/" and we lose the signal.
    const pathname = u.pathname.replace(/\/+$/, '');

    // Special-case our Next rewrite prefix: keep "/iiif-proxy/" literal.
    // Everything after it is the IIIF identifier and must be a single segment:
    // encode any "/" as "%2F".
    const proxyPrefix = '/iiif-proxy/';
    if (pathname.startsWith(proxyPrefix)) {
      const identifier = pathname.slice(proxyPrefix.length);
      const encodedIdentifier = identifier.replace(/\//g, '%2F');
      return `${u.origin}${proxyPrefix}${encodedIdentifier}`.replace(/\/+$/, '');
    }

    let decoded = decodeURIComponent(pathname);
    decoded = encodeIiifPathIdentifier(decoded);
    return `${u.origin}${decoded}`.replace(/\/+$/, '');
  } catch {
    const proxyPrefix = '/iiif-proxy/';
    if (cleaned.startsWith(proxyPrefix)) {
      const identifier = cleaned.slice(proxyPrefix.length).replace(/^\/+/, '');
      const encodedIdentifier = identifier.replace(/\//g, '%2F');
      return `${proxyPrefix}${encodedIdentifier}`.replace(/\/+$/, '');
    }
    return cleaned;
  }
}

function clampCoordinatesToBounds(
  coords: IIIFCoordinates,
  bounds?: { width?: number; height?: number }
): IIIFCoordinates {
  const maxW = bounds?.width;
  const maxH = bounds?.height;
  let x = Math.max(0, Math.round(coords.x));
  let y = Math.max(0, Math.round(coords.y));
  let w = Math.max(1, Math.round(coords.w));
  let h = Math.max(1, Math.round(coords.h));
  if (typeof maxW === 'number' && maxW > 0) {
    if (x >= maxW) x = Math.max(0, maxW - 1);
    if (x + w > maxW) w = Math.max(1, maxW - x);
  }
  if (typeof maxH === 'number' && maxH > 0) {
    if (y >= maxH) y = Math.max(0, maxH - 1);
    if (y + h > maxH) h = Math.max(1, maxH - y);
  }
  return { x, y, w, h };
}

function parseXywh(value: string): IIIFCoordinates | null {
  const m = value.match(/xywh=pixel:([\d.]+),([\d.]+),([\d.]+),([\d.]+)/);
  if (!m) return null;
  return { x: Number(m[1]), y: Number(m[2]), w: Number(m[3]), h: Number(m[4]) };
}

function clampXywh(
  xywh: IIIFCoordinates,
  bounds?: { width?: number; height?: number }
): { region: string } {
  const clamped = clampCoordinatesToBounds(xywh, bounds);
  return { region: `${clamped.x},${clamped.y},${clamped.w},${clamped.h}` };
}

function noUpscaleBestFitSizePart(size: number, crop: Pick<IIIFCoordinates, 'w' | 'h'>): string {
  const pixelSize = Math.max(1, Math.round(size));
  const width =
    Number.isFinite(crop.w) && crop.w > 0 ? Math.min(pixelSize, Math.round(crop.w)) : pixelSize;
  const height =
    Number.isFinite(crop.h) && crop.h > 0 ? Math.min(pixelSize, Math.round(crop.h)) : pixelSize;
  return `!${Math.max(1, width)},${Math.max(1, height)}`;
}

function thumbnailPixelSize(options?: IIIFImageUrlOptions): number {
  return typeof options?.maxSize === 'number' && options.maxSize > 0
    ? Math.round(options.maxSize)
    : DEFAULT_THUMBNAIL_SIZE;
}

// --- Public API ---

export function getIiifBaseUrl(infoUrl: string): string {
  return normalizeIiifBase(resolveInfoUrl(infoUrl));
}

export function getSelectorValue(a: unknown): string | null {
  const anyA = a as { target?: { selector?: { value?: string } } };
  return anyA?.target?.selector?.value ?? null;
}

export function iiifThumbFromSelector(
  iiifBase: string,
  selectorValue: string,
  size = 200,
  bounds?: { width?: number; height?: number }
): string | null {
  const xywh = parseXywh(selectorValue);
  if (!xywh) return null;
  // Clamp against the real image dimensions when the caller has them (one
  // info.json fetch serves every thumbnail sharing the same iiifBase), so a
  // region whose x+w / y+h overflows the page can't produce an out-of-range
  // IIIF region string that a 3.0-strict server may reject. When bounds are
  // unknown this still rounds/floors as before.
  const { region } = clampXywh(xywh, bounds);
  // Resolve first so absolute upstream bases (including ones persisted in the
  // lightbox before the /iiif-proxy switch) become same-origin proxy paths.
  const base = normalizeIiifBase(resolveInfoUrl(iiifBase));
  const sizePart = xywh.w < size ? 'max' : `${size},`;
  return `${base}/${region}/${sizePart}/0/default.jpg`;
}

export function getIiifImageUrl(infoUrl: string, options?: IIIFImageUrlOptions): string {
  const resolved = resolveInfoUrl(infoUrl);
  const base = normalizeIiifBase(resolved);
  const region = options?.coordinates
    ? `${Math.round(options.coordinates.x)},${Math.round(options.coordinates.y)},${Math.round(options.coordinates.w)},${Math.round(options.coordinates.h)}`
    : 'full';
  let size: string;
  if (options?.thumbnail) {
    const thumbnailSize = thumbnailPixelSize(options);
    const regionW = options?.coordinates?.w;
    if (typeof regionW === 'number' && regionW > 0 && regionW < thumbnailSize) {
      size = 'max';
    } else {
      size = `${thumbnailSize},`;
    }
  } else if (typeof options?.maxSize === 'number' && options.maxSize > 0) {
    size =
      options.coordinates != null
        ? noUpscaleBestFitSizePart(options.maxSize, options.coordinates)
        : `!${options.maxSize},${options.maxSize}`;
  } else {
    size = 'max';
  }
  return `${base}/${region}/${size}/0/default.jpg`;
}

export async function fetchIiifImageInfo(infoUrl: string): Promise<IIIFImageInfo | null> {
  const resolved = resolveInfoUrl(infoUrl);
  const url = resolved.endsWith('/info.json')
    ? resolved
    : resolved.replace(/\/+$/, '') + '/info.json';
  const cached = IIIF_INFO_CACHE.get(url);
  if (cached !== undefined) return cached;
  const inflight = IIIF_INFO_INFLIGHT.get(url);
  if (inflight) return inflight;
  const request = (async () => {
    try {
      const res = await fetch(url);
      if (!res.ok) return null;
      const info = (await res.json()) as { width?: number; height?: number };
      const width = Number(info?.width);
      const height = Number(info?.height);
      if (!Number.isFinite(width) || !Number.isFinite(height) || width < 1 || height < 1)
        return null;
      return { width, height };
    } catch {
      return null;
    }
  })();
  IIIF_INFO_INFLIGHT.set(url, request);
  const result = await request;
  IIIF_INFO_INFLIGHT.delete(url);
  // Only persist successful results: a null (transient timeout / 5xx / CORS
  // hiccup) would otherwise poison the cache for the lifetime of the page and
  // block recovery on a later retry. The inflight map already dedupes concurrent
  // calls, so a failure simply falls through to a fresh fetch next time.
  if (result != null) IIIF_INFO_CACHE.set(url, result);
  return result;
}

export async function getIiifImageUrlWithBounds(
  infoUrl: string,
  options?: IIIFImageUrlOptions
): Promise<string> {
  if (!options?.coordinates) {
    return getIiifImageUrl(infoUrl, options);
  }
  const bounds = await fetchIiifImageInfo(infoUrl);
  // flipY needs the image height to map a bottom-left GeoJSON origin to IIIF's
  // top-left origin. Without bounds we cannot flip, and emitting the un-flipped
  // y would render the wrong vertical band of the page. Throw instead so the
  // caller's catch/placeholder path engages rather than silently mis-cropping.
  if (bounds == null && options.flipY) {
    throw new Error(`IIIF info unavailable for flipY region: ${infoUrl}`);
  }
  let coordinates = options.coordinates;
  if (bounds != null) {
    if (options.flipY) {
      coordinates = {
        ...coordinates,
        y: bounds.height - coordinates.y - coordinates.h,
      };
    }
    coordinates = clampCoordinatesToBounds(coordinates, {
      width: bounds.width,
      height: bounds.height,
    });
  }
  return getIiifImageUrl(infoUrl, { ...options, coordinates });
}

export function coordinatesFromGeoJson(
  coordinatesJson: string | null | undefined
): IIIFCoordinates | null {
  if (coordinatesJson == null || coordinatesJson === '') return null;
  try {
    const data =
      typeof coordinatesJson === 'string' ? JSON.parse(coordinatesJson) : coordinatesJson;
    const geometry = data?.type === 'Feature' ? data?.geometry : data;
    if (geometry?.type !== 'Polygon' || !Array.isArray(geometry.coordinates?.[0])) return null;
    const ring = geometry.coordinates[0];
    const xs = ring.map((p: number[]) => p[0]);
    const ys = ring.map((p: number[]) => p[1]);
    return {
      x: Math.round(Math.min(...xs)),
      y: Math.round(Math.min(...ys)),
      w: Math.round(Math.max(1, Math.max(...xs) - Math.min(...xs))),
      h: Math.round(Math.max(1, Math.max(...ys) - Math.min(...ys))),
    };
  } catch {
    return null;
  }
}
