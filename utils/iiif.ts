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
  const maxW = bounds?.width
  const maxH = bounds?.height

  let x = Math.max(0, Math.round(xywh.x))
  let y = Math.max(0, Math.round(xywh.y))
  let w = Math.max(1, Math.round(xywh.w))
  let h = Math.max(1, Math.round(xywh.h))

  if (typeof maxW === 'number' && maxW > 0) {
    if (x >= maxW) x = Math.max(0, maxW - 1)
    if (x + w > maxW) w = Math.max(1, maxW - x)
  }

  if (typeof maxH === 'number' && maxH > 0) {
    if (y >= maxH) y = Math.max(0, maxH - 1)
    if (y + h > maxH) h = Math.max(1, maxH - y)
  }

  return { region: `${x},${y},${w},${h}` }
}

export function normalizeIiifBase(iiifBase: string): string {
  const cleaned = iiifBase.replace(/\/info\.json$/, '').replace(/\/+$/, '')
  try {
    const u = new URL(cleaned)
    const decodedPath = decodeURIComponent(u.pathname)
    return `${u.origin}${decodedPath}`.replace(/\/+$/, '')
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