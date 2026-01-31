'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useSelectedImages } from '@/stores/lightbox-store'
import { LightboxImageLayer } from './lightbox-image-layer'
import {
  LightboxComparisonHeader,
  type ComparisonViewMode,
} from './lightbox-comparison-header'

interface LightboxComparisonModeProps {
  onClose: () => void
}

export function LightboxComparisonMode({ onClose }: LightboxComparisonModeProps) {
  const selectedImages = useSelectedImages()
  const [mode, setMode] = useState<ComparisonViewMode>('side-by-side')
  const [overlayOpacity, setOverlayOpacity] = useState(0.5)

  if (selectedImages.length < 2) {
    return (
      <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-xl p-6 max-w-md">
          <h3 className="text-lg font-semibold mb-2">Comparison Mode</h3>
          <p className="text-muted-foreground mb-4">
            Please select at least 2 images to compare
          </p>
          <Button onClick={onClose}>Close</Button>
        </div>
      </div>
    )
  }

  const image1 = selectedImages[0]!
  const image2 = selectedImages[1]!

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      <LightboxComparisonHeader
        title="Comparison Mode"
        mode={mode}
        onModeChange={setMode}
        overlayOpacity={overlayOpacity}
        onOverlayOpacityChange={setOverlayOpacity}
        onClose={onClose}
      />

      {/* Comparison View */}
      <div className="flex-1 flex overflow-hidden">
        {mode === 'side-by-side' ? (
          <>
            <div className="flex-1 border-r overflow-auto">
              <div className="p-4">
                <h4 className="text-sm font-medium mb-2">
                  {image1.metadata.shelfmark || image1.metadata.locus || 'Image 1'}
                </h4>
                <LightboxImageLayer images={[image1]} />
              </div>
            </div>
            <div className="flex-1 overflow-auto">
              <div className="p-4">
                <h4 className="text-sm font-medium mb-2">
                  {image2.metadata.shelfmark || image2.metadata.locus || 'Image 2'}
                </h4>
                <LightboxImageLayer images={[image2]} />
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 relative overflow-auto">
            <div className="relative w-full h-full">
              {/* Base image */}
              <div className="absolute inset-0">
                <LightboxImageLayer images={[image1]} />
              </div>
              {/* Overlay image */}
              <div
                className="absolute inset-0"
                style={{ opacity: overlayOpacity }}
              >
                <LightboxImageLayer images={[image2]} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
