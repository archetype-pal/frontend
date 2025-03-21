export interface IIIFImageParams {
  region?: string
  size?: string
  rotation?: number
  quality?: 'default' | 'color' | 'gray' | 'bitonal'
  format?: 'jpg' | 'png' | 'gif' | 'webp'
}

export class IIIFImage {
  private baseUrl: string
  private identifier: string
  private originalWidth = 1000 // Default value
  private originalHeight = 1000 // Default value
  private maxWidth = 1000 // Maximum allowed width
  private maxHeight = 1000 // Maximum allowed height
  private infoLoaded = false
  private serverType: 'standard' | 'custom' = 'standard'

  constructor(iiifUrl: string) {
    // Check if this is a known server with custom requirements
    if (iiifUrl.includes('api.archetype.rancho.me')) {
      this.serverType = 'custom'
    }

    // Parse the URL to extract the base URL and identifier
    try {
      // Handle URLs with /iiif/ in the path
      if (iiifUrl.includes('/iiif/')) {
        const urlParts = iiifUrl.split('/')
        const iiifIndex = urlParts.findIndex((part) => part === 'iiif')
        if (iiifIndex === -1) {
          throw new Error('Invalid IIIF URL: missing "iiif" in the path')
        }
        this.identifier = urlParts[iiifIndex + 1]
        this.baseUrl = urlParts.slice(0, iiifIndex + 1).join('/')
      }
      // Handle direct image URLs (like the one from api.archetype.rancho.me)
      else if (iiifUrl.includes('/full/') && iiifUrl.includes('/0/default')) {
        const urlParts = iiifUrl.split('/')
        // Find the index of "full" or similar size parameter
        const sizeIndex = urlParts.findIndex(
          (part) =>
            part === 'full' || part.includes('pct:') || part.includes(',')
        )
        if (sizeIndex > 0) {
          // The identifier is everything before the region parameter
          const regionIndex = sizeIndex - 1
          this.identifier = urlParts.slice(0, regionIndex).join('/')
          this.baseUrl = ''
        } else {
          throw new Error('Could not parse IIIF URL structure')
        }
      } else {
        // For other URL formats, just use the whole URL as the identifier
        this.identifier = iiifUrl
        this.baseUrl = ''
      }
    } catch (error) {
      console.error('Error parsing IIIF URL:', error)
      // Fallback: use the entire URL as the identifier
      this.identifier = iiifUrl
      this.baseUrl = ''
    }
  }

  async initialize(): Promise<void> {
    try {
      await this.fetchImageInfo()
    } catch (error) {
      console.error('Failed to initialize IIIF image:', error)
      // If we can't get the info.json, we'll still try to work with the image
      // using default dimensions
    }
  }

  private async fetchImageInfo(): Promise<void> {
    try {
      // For custom servers that don't follow the standard pattern,
      // we might need to skip the info.json request
      if (this.serverType === 'custom') {
        // For now, just use default dimensions
        this.infoLoaded = true
        return
      }

      const infoUrl = `${this.baseUrl}/${this.identifier}/info.json`
      const response = await fetch(infoUrl)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error(`Expected JSON, but got ${contentType}`)
      }

      const info = await response.json()
      this.originalWidth = info.width
      this.originalHeight = info.height
      this.maxWidth = info.maxWidth || info.width
      this.maxHeight = info.maxHeight || info.height
      this.infoLoaded = true
    } catch (error) {
      console.error('Failed to fetch image info:', error)
      throw error
    }
  }

  getImageUrl({
    region = 'full',
    size = 'max',
    rotation = 0,
    quality = 'default',
    format = 'jpg',
  }: IIIFImageParams = {}): string {
    // For the custom server that doesn't accept "full" as size
    if (this.serverType === 'custom' && (size === 'full' || size === 'max')) {
      size = 'max' // Use "max" instead of "full"
    }

    if (this.baseUrl) {
      return `${this.baseUrl}/${this.identifier}/${region}/${size}/${rotation}/${quality}.${format}`
    } else {
      // If we don't have a separate base URL, the identifier is the full path
      // Just replace the size parameter in the original URL
      const urlParts = this.identifier.split('/')
      const sizeIndex = urlParts.findIndex(
        (part) => part === 'full' || part.includes('pct:') || part.includes(',')
      )
      if (sizeIndex > 0) {
        urlParts[sizeIndex] = size
        return urlParts.join('/')
      }
      // Fallback to constructing a standard IIIF URL
      return `${this.identifier}/${region}/${size}/${rotation}/${quality}.${format}`
    }
  }

  getScaledUrl(scale: number): string {
    if (scale >= 1) {
      // For custom servers that don't accept "full"
      if (this.serverType === 'custom') {
        return this.getImageUrl({ size: 'max' })
      }
      return this.getImageUrl({ size: 'max' })
    }

    // For scaled down images, use a percentage or specific width
    const targetWidth = Math.round(this.originalWidth * scale)
    if (this.serverType === 'custom') {
      // Some servers prefer pct: format
      return this.getImageUrl({ size: `pct:${Math.round(scale * 100)}` })
    }
    return this.getImageUrl({ size: `${targetWidth},` })
  }

  getRegionUrl(
    x: number,
    y: number,
    width: number,
    height: number,
    zoom: number
  ): string {
    const pixelX = Math.floor((x / 100) * this.originalWidth)
    const pixelY = Math.floor((y / 100) * this.originalHeight)
    const pixelWidth = Math.floor((width / 100) * this.originalWidth)
    const pixelHeight = Math.floor((height / 100) * this.originalHeight)

    const region = `${pixelX},${pixelY},${pixelWidth},${pixelHeight}`

    // For custom servers that don't accept "full"
    let size
    if (this.serverType === 'custom') {
      if (zoom > 1) {
        size = 'max'
      } else {
        size = `pct:${Math.round(zoom * 100)}`
      }
    } else {
      size =
        zoom > 1
          ? 'max'
          : `${Math.floor(pixelWidth * zoom)},${Math.floor(pixelHeight * zoom)}`
    }

    return this.getImageUrl({ region, size })
  }

  getDimensions() {
    return {
      width: this.originalWidth,
      height: this.originalHeight,
      loaded: this.infoLoaded,
    }
  }
}
