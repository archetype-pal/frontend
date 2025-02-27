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
    // Remove any trailing /info.json
    this.baseUrl = baseUrl.replace('/info.json', '')
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
