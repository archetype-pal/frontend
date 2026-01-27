'use client'

import * as React from 'react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { X, Split, Layers } from 'lucide-react'
import { useLightboxStore } from '@/stores/lightbox-store'
import { LightboxImageLayer } from './lightbox-image-layer'
import { cn } from '@/lib/utils'

type ComparisonMode = 'side-by-side' | 'overlay'

interface LightboxComparisonModeProps {
  onClose: () => void
}

export function LightboxComparisonMode({ onClose }: LightboxComparisonModeProps) {
  const { selectedImageIds, images, currentWorkspaceId } = useLightboxStore()
  const [mode, setMode] = useState<ComparisonMode>('side-by-side')
  const [overlayOpacity, setOverlayOpacity] = useState(0.5)

  const selectedImages = React.useMemo(() => {
    return Array.from(selectedImageIds)
      .map((id) => images.get(id))
      .filter((img): img is NonNullable<typeof img> => img !== undefined)
  }, [selectedImageIds, images])

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
      {/* Header */}
      <div className="bg-white border-b px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-semibold">Comparison Mode</h3>
          <div className="flex gap-2">
            <Button
              variant={mode === 'side-by-side' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setMode('side-by-side')}
            >
              <Split className="h-4 w-4 mr-2" />
              Side-by-Side
            </Button>
            <Button
              variant={mode === 'overlay' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setMode('overlay')}
            >
              <Layers className="h-4 w-4 mr-2" />
              Overlay
            </Button>
          </div>
          {mode === 'overlay' && (
            <div className="flex items-center gap-2">
              <label className="text-sm">Opacity:</label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={overlayOpacity}
                onChange={(e) => setOverlayOpacity(Number(e.target.value))}
                className="w-24"
              />
              <span className="text-sm">{Math.round(overlayOpacity * 100)}%</span>
            </div>
          )}
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

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
