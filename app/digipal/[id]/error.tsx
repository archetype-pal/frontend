'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { AlertCircle } from 'lucide-react'

export default function DigipalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log only in dev; avoid leaking into overlay
    if (process.env.NODE_ENV === 'development') {
      console.error('[digipal]', error.message)
    }
  }, [error])

  return (
    <div className="flex min-h-[50vh] items-center justify-center p-8">
      <div className="text-center max-w-md">
        <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2">Manuscript viewer error</h2>
        <p className="text-muted-foreground mb-4 break-words">
          {error.message || 'Something went wrong loading this image.'}
        </p>
        <p className="text-sm text-muted-foreground mb-6">
          If the image server (Sipi) is not running, or the IIIF URL is wrong, the viewer will fail. Try again after starting the image server.
        </p>
        <Button onClick={reset}>Try again</Button>
      </div>
    </div>
  )
}
