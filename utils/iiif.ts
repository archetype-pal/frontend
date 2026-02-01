/**
 * IIIF Image API 2.x helpers: resolve info URLs, build image URLs, clamp regions.
 */

/** Region coordinates: x,y (top-left), w,h (width, height). */
export type IIIFCoordinates = { x: number; y: number; w: number; h: number }

/** Options for building a IIIF image URL from an info URL. */
export type IIIFImageUrlOptions = {
  coordinates?: IIIFCoordinates
  thumbnail?: boolean
}

/** IIIF Image Information 2.x – width/height from info.json. */
export interface IIIFImageInfo {
  width: number
  height: number
}

// --- Internal constants and helpers (not exported) ---

const DEFAULT_THUMBNAIL_SIZE = 300
const IIIF_PREFIX_LEN: Record<string, number> = { sipi: 2, iiif: 2 }

function resolveInfoUrl(infoUrl: string): string {
  const trimmed = (infoUrl || '').trim()
  if (!trimmed) return trimmed
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed
  const apiBase = typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_API_URL
    ? process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, '')
    : ''
  return apiBase ? `${apiBase}${trimmed.startsWith('/') ? '' : '/'}${trimmed}` : trimmed
}

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

function normalizeIiifBase(iiifBase: string): string {
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

function clampCoordinatesToBounds(
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

function parseXywh(value: string): IIIFCoordinates | null {
  const m = value.match(/xywh=pixel:([\d.]+),([\d.]+),([\d.]+),([\d.]+)/)
  if (!m) return null
  return { x: Number(m[1]), y: Number(m[2]), w: Number(m[3]), h: Number(m[4]) }
}

function clampXywh(
  xywh: IIIFCoordinates,
  bounds?: { width?: number; height?: number }
): { region: string } {
  const clamped = clampCoordinatesToBounds(xywh, bounds)
  return { region: `${clamped.x},${clamped.y},${clamped.w},${clamped.h}` }
}

// --- Public API ---

export function getIiifBaseUrl(infoUrl: string): string {
  return normalizeIiifBase(resolveInfoUrl(infoUrl))
}

export function getSelectorValue(a: unknown): string | null {
  const anyA = a as { target?: { selector?: { value?: string } } }
  return anyA?.target?.selector?.value ?? null
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
  const sizePart = xywh.w < size ? 'max' : `${size},`
  return `${base}/${region}/${sizePart}/0/default.jpg`
}

export function getIiifImageUrl(
  infoUrl: string,
  options?: IIIFImageUrlOptions
): string {
  const resolved = resolveInfoUrl(infoUrl)
  const base = normalizeIiifBase(resolved)
  const region = options?.coordinates
    ? `${Math.round(options.coordinates.x)},${Math.round(options.coordinates.y)},${Math.round(options.coordinates.w)},${Math.round(options.coordinates.h)}`
    : 'full'
  let size: string
  if (options?.thumbnail) {
    const regionW = options?.coordinates?.w
    if (typeof regionW === 'number' && regionW > 0 && regionW < DEFAULT_THUMBNAIL_SIZE) {
      size = 'max'
    } else {
      size = `${DEFAULT_THUMBNAIL_SIZE},`
    }
  } else {
    size = 'max'
  }
  return `${base}/${region}/${size}/0/default.jpg`
}

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

export function coordinatesFromGeoJson(coordinatesJson: string | null | undefined): IIIFCoordinates | null {
  if (coordinatesJson == null || coordinatesJson === '') return null
  try {
    const data = typeof coordinatesJson === 'string' ? JSON.parse(coordinatesJson) : coordinatesJson
    const geometry = data?.type === 'Feature' ? data?.geometry : data
    if (geometry?.type !== 'Polygon' || !Array.isArray(geometry.coordinates?.[0])) return null
    const ring = geometry.coordinates[0]
    const xs = ring.map((p: number[]) => p[0])
    const ys = ring.map((p: number[]) => p[1])
    return {
      x: Math.round(Math.min(...xs)),
      y: Math.round(Math.min(...ys)),
      w: Math.round(Math.max(1, Math.max(...xs) - Math.min(...xs))),
      h: Math.round(Math.max(1, Math.max(...ys) - Math.min(...ys))),
    }
  } catch {
    return null
  }
}
