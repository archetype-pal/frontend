'use client'

import { Button } from '@/components/ui/button'
import { X, Split, Layers } from 'lucide-react'

export type ComparisonViewMode = 'side-by-side' | 'overlay'

interface LightboxComparisonHeaderProps {
  title: string
  mode: ComparisonViewMode
  onModeChange: (mode: ComparisonViewMode) => void
  overlayOpacity?: number
  onOverlayOpacityChange?: (value: number) => void
  onClose: () => void
}

export function LightboxComparisonHeader({
  title,
  mode,
  onModeChange,
  overlayOpacity = 0.5,
  onOverlayOpacityChange,
  onClose,
}: LightboxComparisonHeaderProps) {
  return (
    <div className="bg-white border-b px-4 py-2 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <h3 className="text-lg font-semibold">{title}</h3>
        <div className="flex gap-2">
          <Button
            variant={mode === 'side-by-side' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onModeChange('side-by-side')}
          >
            <Split className="h-4 w-4 mr-2" />
            Side-by-Side
          </Button>
          <Button
            variant={mode === 'overlay' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onModeChange('overlay')}
          >
            <Layers className="h-4 w-4 mr-2" />
            Overlay
          </Button>
        </div>
        {mode === 'overlay' && onOverlayOpacityChange && (
          <div className="flex items-center gap-2">
            <label className="text-sm">Opacity:</label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={overlayOpacity}
              onChange={(e) => onOverlayOpacityChange(Number(e.target.value))}
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
  )
}
