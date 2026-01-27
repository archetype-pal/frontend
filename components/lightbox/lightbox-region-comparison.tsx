'use client'

import * as React from 'react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { X, Split, Layers } from 'lucide-react'
import { getWorkspaceRegions } from '@/lib/lightbox-db'
import { useLightboxStore } from '@/stores/lightbox-store'
import type { LightboxRegion } from '@/lib/lightbox-db'

interface LightboxRegionComparisonProps {
  onClose: () => void
}

export function LightboxRegionComparison({ onClose }: LightboxRegionComparisonProps) {
  const { currentWorkspaceId } = useLightboxStore()
  const [regions, setRegions] = useState<LightboxRegion[]>([])
  const [selectedRegions, setSelectedRegions] = useState<string[]>([])
  const [mode, setMode] = useState<'side-by-side' | 'overlay'>('side-by-side')
  const [overlayOpacity, setOverlayOpacity] = useState(0.5)

  React.useEffect(() => {
    if (!currentWorkspaceId) return

    const workspaceId = currentWorkspaceId
    async function loadRegions() {
      try {
        const workspaceRegions = await getWorkspaceRegions(workspaceId)
        setRegions(workspaceRegions)
      } catch (error) {
        console.error('Failed to load regions:', error)
      }
    }

    loadRegions()
  }, [currentWorkspaceId])

  const handleRegionSelect = (regionId: string) => {
    setSelectedRegions((prev) => {
      if (prev.includes(regionId)) {
        return prev.filter((id) => id !== regionId)
      }
      if (prev.length < 2) {
        return [...prev, regionId]
      }
      return [prev[1], regionId] // Replace first with new selection
    })
  }

  const selectedRegionData = selectedRegions
    .map((id) => regions.find((r) => r.id === id))
    .filter(Boolean) as LightboxRegion[]

  if (regions.length === 0) {
    return (
      <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-xl p-6 max-w-md">
          <h3 className="text-lg font-semibold mb-2">Region Comparison</h3>
          <p className="text-muted-foreground mb-4">
            No regions found. Create regions by cropping images first.
          </p>
          <Button onClick={onClose}>Close</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Header */}
      <div className="bg-white border-b px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-semibold">Region Comparison</h3>
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

      {/* Region Selection */}
      <div className="bg-gray-50 border-b px-4 py-2">
        <div className="flex flex-wrap gap-2">
          {regions.map((region) => (
            <Button
              key={region.id}
              variant={selectedRegions.includes(region.id) ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleRegionSelect(region.id)}
            >
              {region.title}
            </Button>
          ))}
        </div>
      </div>

      {/* Comparison View */}
      {selectedRegionData.length >= 2 ? (
        <div className="flex-1 flex overflow-hidden">
          {mode === 'side-by-side' ? (
            <>
              <div className="flex-1 border-r overflow-auto p-4">
                <h4 className="text-sm font-medium mb-2">{selectedRegionData[0].title}</h4>
                <img
                  src={selectedRegionData[0].imageData}
                  alt={selectedRegionData[0].title}
                  className="max-w-full h-auto"
                />
              </div>
              <div className="flex-1 overflow-auto p-4">
                <h4 className="text-sm font-medium mb-2">{selectedRegionData[1].title}</h4>
                <img
                  src={selectedRegionData[1].imageData}
                  alt={selectedRegionData[1].title}
                  className="max-w-full h-auto"
                />
              </div>
            </>
          ) : (
            <div className="flex-1 relative overflow-auto p-4">
              <div className="relative inline-block">
                <img
                  src={selectedRegionData[0].imageData}
                  alt={selectedRegionData[0].title}
                  className="max-w-full h-auto"
                />
                <img
                  src={selectedRegionData[1].imageData}
                  alt={selectedRegionData[1].title}
                  className="absolute top-0 left-0 max-w-full h-auto"
                  style={{ opacity: overlayOpacity }}
                />
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">
            Select 2 regions to compare
          </p>
        </div>
      )}
    </div>
  )
}
