import { ImageOff } from 'lucide-react'
import Image from 'next/image'
import { getIiifImageUrl } from '@/utils/iiif'
import { cn } from '@/lib/utils'

interface IiifThumbnailProps {
  image: string | null
  alt?: string
  locus?: string
  sizes?: string
  className?: string
  children?: React.ReactNode
}

export function IiifThumbnail({
  image,
  alt,
  locus,
  sizes = '80px',
  className,
  children,
}: IiifThumbnailProps) {
  const thumbUrl = image ? getIiifImageUrl(image, { thumbnail: true }) : null

  return (
    <div
      className={cn(
        'group relative aspect-square rounded-md border bg-muted overflow-hidden',
        className
      )}
    >
      {thumbUrl ? (
        <Image
          src={thumbUrl}
          alt={alt || locus || 'Image'}
          fill
          className='object-cover'
          sizes={sizes}
        />
      ) : (
        <div className='flex items-center justify-center h-full text-xs text-muted-foreground'>
          <ImageOff className='h-5 w-5' />
        </div>
      )}
      {locus !== undefined && (
        <div className='absolute bottom-0 inset-x-0 bg-black/60 px-1 py-0.5 z-10'>
          <p className='text-[9px] text-white truncate'>{locus || '—'}</p>
        </div>
      )}
      {children}
    </div>
  )
}
