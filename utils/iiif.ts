export interface IIIFImageParams {
  region?: string
  size?: string
  rotation?: number
  quality?: 'default' | 'color' | 'gray' | 'bitonal'
  format?: 'jpg' | 'png' | 'gif' | 'webp'
}

export class IIIFImage {
  private baseUrl: string
  private originalWidth = 1000 // Default value, should be fetched from info.json
  private originalHeight = 1000 // Default value, should be fetched from info.json
  private maxWidth = 1000 // Maximum allowed width
  private maxHeight = 1000 // Maximum allowed height

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace('/info.json', '').replace(/\/+$/, '')
    this.fetchImageInfo()
  }

  private async fetchImageInfo() {
    try {
      const response = await fetch(`${this.baseUrl}/info.json`)
      const info = await response.json()
      this.originalWidth = info.width
      this.originalHeight = info.height
      this.maxWidth = info.maxWidth || info.width
      this.maxHeight = info.maxHeight || info.height
    } catch (error) {
      console.error('Failed to fetch image info:', error)
    }
  }

  getImageUrl({
    region = 'full',
    size = 'max',
    rotation = 0,
    quality = 'default',
    format = 'jpg',
  }: IIIFImageParams = {}): string {
    return `${this.baseUrl}/${region}/${size}/${rotation}/${quality}.${format}`
  }

  getScaledUrl(scale: number): string {
    // If scale is 1 or greater, use "max" to prevent upscaling errors
    if (scale >= 1) {
      return this.getImageUrl({ size: 'max' })
    }

    // For downscaling, calculate the target width
    const targetWidth = Math.round(this.originalWidth * scale)
    return this.getImageUrl({ size: `${targetWidth},` })
  }
}

export type Xywh = { x: number; y: number; w: number; h: number }

export function parseXywh(value: string): Xywh | null {
  const m = value.match(/xywh=pixel:([\d.]+),([\d.]+),([\d.]+),([\d.]+)/)
  if (!m) return null
  return { x: Number(m[1]), y: Number(m[2]), w: Number(m[3]), h: Number(m[4]) }
}

export function getSelectorValue(a: unknown): string | null {
  const anyA = a as { target?: { selector?: { value?: string } } }
  return anyA?.target?.selector?.value ?? null
}

export function clampXywh(
  xywh: Xywh,
  bounds?: { width?: number; height?: number }
): { region: string } {
  const clamped = clampCoordinatesToBounds(
    { x: xywh.x, y: xywh.y, w: xywh.w, h: xywh.h },
    bounds
  )
  return { region: `${clamped.x},${clamped.y},${clamped.w},${clamped.h}` }
}

/** Clamp region coordinates to image bounds so they never exceed width/height. */
export function clampCoordinatesToBounds(
  coords: IIIFCoordinates,
  bounds?: { width?: number; height?: number }
): IIIFCoordinates {
  const maxW = bounds?.width
  const maxH = bounds?.height

  let x = Math.max(0, Math.round(coords.x))
  let y = Math.max(0, Math.round(coords.y))
  let w = Math.max(1, Math.round(coords.w))
  let h = Math.max(1, Math.round(coords.h))

  if (typeof maxW === 'number' && maxW > 0) {
    if (x >= maxW) x = Math.max(0, maxW - 1)
    if (x + w > maxW) w = Math.max(1, maxW - x)
  }

  if (typeof maxH === 'number' && maxH > 0) {
    if (y >= maxH) y = Math.max(0, maxH - 1)
    if (y + h > maxH) h = Math.max(1, maxH - y)
  }

  return { x, y, w, h }
}

/** Known IIIF service path prefixes – we keep this many path segments before the identifier. */
const IIIF_PREFIX_LEN: Record<string, number> = { sipi: 2, iiif: 2 }

/**
 * Encode slashes in the IIIF path identifier so the server receives one segment.
 * IIIF Image API 2.0: slashes in the identifier MUST be encoded as %2F.
 * If the path starts with a known prefix (sipi, iiif), keep 2 segments and encode the rest;
 * otherwise encode the entire path into one segment (e.g. /historical_items%2F2024%2Fimage.jpg).
 */
function encodeIiifPathIdentifier(pathname: string): string {
  const segments = pathname.split('/').filter(Boolean)
  if (segments.length <= 1) return pathname
  const keep = IIIF_PREFIX_LEN[segments[0]] ?? 0
  const prefixSegments = keep > 0 ? segments.slice(0, Math.min(keep, segments.length - 1)) : []
  const identifier = prefixSegments.length > 0 ? segments.slice(prefixSegments.length).join('/') : segments.join('/')
  const encodedIdentifier = identifier.replace(/\//g, '%2F')
  if (prefixSegments.length === 0) return '/' + encodedIdentifier
  return '/' + prefixSegments.join('/') + '/' + encodedIdentifier
}

export function normalizeIiifBase(iiifBase: string): string {
  // Strip /info.json or IIIF Image API request path (/region/size/rotation/quality.format)
  let cleaned = iiifBase.replace(/\/info\.json$/i, '').replace(/\/+$/, '')
  cleaned = cleaned.replace(/\/full\/[^/]+\/\d+\/(?:default|color|gray|bitonal)\.(?:jpg|png|gif|webp)$/i, '')
  try {
    const u = new URL(cleaned)
    let pathname = decodeURIComponent(u.pathname)
    pathname = encodeIiifPathIdentifier(pathname)
    return `${u.origin}${pathname}`.replace(/\/+$/, '')
  } catch {
    return cleaned
  }
}

export function iiifThumbFromSelector(
  iiifBase: string,
  selectorValue: string,
  size = 200
): string | null {
  const xywh = parseXywh(selectorValue)
  if (!xywh) return null

  const { region } = clampXywh(xywh)
  const base = normalizeIiifBase(iiifBase)

  // Prevent Sipi upscaling errors:
  // If the crop is narrower than requested size, use "max" (no upscaling).
  const sizePart = xywh.w < size ? 'max' : `${size},`

  return `${base}/${region}/${sizePart}/0/default.jpg`
}

/** Coordinates for a region: x,y (top-left) and w,h (width, height). */
export type IIIFCoordinates = { x: number; y: number; w: number; h: number }

/** Options for building a IIIF image URL from an info URL. */
export type IIIFImageUrlOptions = {
  /** Region as x,y,w,h. If omitted, uses full image. */
  coordinates?: IIIFCoordinates
  /** If true, returns a URL sized for a thumbnail (e.g. max width 300). */
  thumbnail?: boolean
}

const DEFAULT_THUMBNAIL_SIZE = 300

/**
 * Resolve a possibly relative IIIF info URL to an absolute URL using the API base when needed.
 */
function resolveInfoUrl(infoUrl: string): string {
  const trimmed = (infoUrl || '').trim()
  if (!trimmed) return trimmed
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed
  const apiBase = typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_API_URL
    ? process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, '')
    : ''
  return apiBase ? `${apiBase}${trimmed.startsWith('/') ? '' : '/'}${trimmed}` : trimmed
}

/**
 * Build a IIIF Image API 2.x URL from an IIIF info URL.
 * @param infoUrl - IIIF Image Information URL (e.g. ending in /info.json or base), absolute or relative
 * @param options - Optional coordinates and/or thumbnail flag
 * @returns IIIF image request URL (region/size/rotation/quality.format)
 */
export function getIiifImageUrl(
  infoUrl: string,
  options?: IIIFImageUrlOptions
): string {
  const resolved = resolveInfoUrl(infoUrl)
  const base = normalizeIiifBase(resolved)
  const region = options?.coordinates
    ? `${Math.round(options.coordinates.x)},${Math.round(options.coordinates.y)},${Math.round(options.coordinates.w)},${Math.round(options.coordinates.h)}`
    : 'full'
  // Sipi disallows upscaling: when requesting a region, never ask for a size larger than the region
  let size: string
  if (options?.thumbnail) {
    const regionW = options?.coordinates?.w
    if (typeof regionW === 'number' && regionW > 0 && regionW < DEFAULT_THUMBNAIL_SIZE) {
      size = 'max' // region smaller than thumbnail; avoid upscaling
    } else {
      size = `${DEFAULT_THUMBNAIL_SIZE},`
    }
  } else {
    size = 'max'
  }
  return `${base}/${region}/${size}/0/default.jpg`
}

/** IIIF Image Information 2.x – minimal shape for width/height. */
export interface IIIFImageInfo {
  width: number
  height: number
}

/** Fetch IIIF Image Information (info.json) and return width/height, or null on failure. */
export async function fetchIiifImageInfo(infoUrl: string): Promise<IIIFImageInfo | null> {
  const resolved = resolveInfoUrl(infoUrl)
  const url = resolved.endsWith('/info.json') ? resolved : resolved.replace(/\/+$/, '') + '/info.json'
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const info = (await res.json()) as { width?: number; height?: number }
    const width = Number(info?.width)
    const height = Number(info?.height)
    if (!Number.isFinite(width) || !Number.isFinite(height) || width < 1 || height < 1) return null
    return { width, height }
  } catch {
    return null
  }
}

/**
 * Build a IIIF image URL with coordinates clamped to the image’s actual dimensions.
 * Fetches the IIIF info.json when coordinates are provided, clamps the region to width/height, then builds the URL.
 * Use this for graph thumbnails/images so bad coordinates never exceed the image bounds.
 */
export async function getIiifImageUrlWithBounds(
  infoUrl: string,
  options?: IIIFImageUrlOptions
): Promise<string> {
  if (!options?.coordinates) {
    return getIiifImageUrl(infoUrl, options)
  }
  const bounds = await fetchIiifImageInfo(infoUrl)
  const coordinates =
    bounds != null
      ? clampCoordinatesToBounds(options.coordinates, { width: bounds.width, height: bounds.height })
      : options.coordinates
  return getIiifImageUrl(infoUrl, { ...options, coordinates })
}

/**
 * Parse GeoJSON coordinates string (e.g. from graph search "coordinates" field) to IIIF region.
 * Expects a Feature with Polygon geometry or a geometry object.
 * @returns { x, y, w, h } for IIIF region, or null if parsing fails
 */
export function coordinatesFromGeoJson(coordinatesJson: string | null | undefined): IIIFCoordinates | null {
  if (coordinatesJson == null || coordinatesJson === '') return null
  try {
    const data = typeof coordinatesJson === 'string' ? JSON.parse(coordinatesJson) : coordinatesJson
    const geometry = data?.type === 'Feature' ? data?.geometry : data
    if (geometry?.type !== 'Polygon' || !Array.isArray(geometry.coordinates?.[0])) return null
    const ring = geometry.coordinates[0]
    const xs = ring.map((p: number[]) => p[0])
    const ys = ring.map((p: number[]) => p[1])
    const minX = Math.min(...xs)
    const minY = Math.min(...ys)
    const maxX = Math.max(...xs)
    const maxY = Math.max(...ys)
    return {
      x: Math.round(minX),
      y: Math.round(minY),
      w: Math.round(Math.max(1, maxX - minX)),
      h: Math.round(Math.max(1, maxY - minY)),
    }
  } catch {
    return null
  }
}