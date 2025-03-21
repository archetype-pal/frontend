'use client'

import { Button } from '@/components/ui/button'
import { RefreshCw } from 'lucide-react'

interface ImageFallbackProps {
  onRetry: () => void
  error?: string
}

export function ImageFallback({ onRetry, error }: ImageFallbackProps) {
  return (
    <div className='absolute inset-0 flex flex-col items-center justify-center bg-white/90 p-6'>
      <div className='max-w-md text-center'>
        <h3 className='mb-2 text-lg font-semibold'>Unable to load image</h3>
        <p className='mb-4 text-sm text-gray-600'>
          {error ||
            'The image could not be loaded due to CORS restrictions or network issues.'}
        </p>
        <p className='mb-6 text-sm text-gray-600'>
          This is likely because the image server doesn&apos;t allow
          cross-origin requests from this domain.
        </p>
        <Button onClick={onRetry} className='flex items-center gap-2'>
          <RefreshCw className='h-4 w-4' />
          Try Again
        </Button>
      </div>
    </div>
  )
}
