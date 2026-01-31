'use client'

import * as React from 'react'
import { Button } from '@/components/ui/button'
import {
  ZoomIn,
  ZoomOut,
  RotateCw,
  FlipHorizontal,
  FlipVertical,
  Maximize2,
  Download,
  Save,
  Crop,
  Map,
  Ruler,
  Split,
  Layers,
  Grid3x3,
  MessageSquare,
  Upload,
  Undo2,
  Redo2,
} from 'lucide-react'
import { useLightboxStore, useSelectedImages } from '@/stores/lightbox-store'
import { LightboxTransformPanel } from './lightbox-transform-panel'

interface LightboxToolbarProps {
  onCrop?: (imageId: string) => void
  onExport?: () => void
  onSaveSession?: () => void
  onImport?: () => void
  onToggleMinimap?: () => void
  onToggleMeasurement?: () => void
  onToggleComparison?: () => void
  onToggleRegionComparison?: () => void
}

export function LightboxToolbar({
  onCrop,
  onExport,
  onSaveSession,
  onImport,
  onToggleMinimap,
  onToggleMeasurement,
  onToggleComparison,
  onToggleRegionComparison,
}: LightboxToolbarProps = {}) {
  const {
    updateImage,
    zoom,
    setZoom,
    showAnnotations,
    setShowAnnotations,
    showGrid,
    setShowGrid,
    undo,
    redo,
    historyIndex,
    history,
  } = useLightboxStore()
  const selectedImages = useSelectedImages()

  const handleZoomIn = () => {
    setZoom(Math.min(zoom * 1.2, 10))
  }

  const handleZoomOut = () => {
    setZoom(Math.max(zoom / 1.2, 0.1))
  }

  const handleRotate = () => {
    selectedImages.forEach((img) => {
      if (img) {
        updateImage(img.id, {
          transform: {
            ...img.transform,
            rotation: (img.transform.rotation + 90) % 360,
          },
        })
      }
    })
  }

  const handleFlipX = () => {
    selectedImages.forEach((img) => {
      if (img) {
        updateImage(img.id, {
          transform: {
            ...img.transform,
            flipX: !img.transform.flipX,
          },
        })
      }
    })
  }

  const handleFlipY = () => {
    selectedImages.forEach((img) => {
      if (img) {
        updateImage(img.id, {
          transform: {
            ...img.transform,
            flipY: !img.transform.flipY,
          },
        })
      }
    })
  }

  const hasSelection = selectedImages.length > 0

  return (
    <div className="flex items-center gap-2">
      {/* Zoom Controls */}
      <div className="flex items-center gap-1 border-r pr-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleZoomOut}
          disabled={zoom <= 0.1}
        >
          <ZoomOut className="h-4 w-4" />
        </Button>
        <span className="text-sm text-muted-foreground min-w-[60px] text-center">
          {Math.round(zoom * 100)}%
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleZoomIn}
          disabled={zoom >= 10}
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
      </div>

      {/* Transform Controls */}
      {hasSelection && (
        <>
          <LightboxTransformPanel />
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRotate}
            title="Rotate 90°"
          >
            <RotateCw className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleFlipX}
            title="Flip Horizontal"
          >
            <FlipHorizontal className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleFlipY}
            title="Flip Vertical"
          >
            <FlipVertical className="h-4 w-4" />
          </Button>
        </>
      )}

      {/* Actions */}
      {hasSelection && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            const firstSelected = selectedImages[0]
            if (firstSelected && onCrop) {
              onCrop(firstSelected.id)
            }
          }}
          title="Crop Image"
        >
          <Crop className="h-4 w-4" />
        </Button>
      )}

      {/* Undo/Redo */}
      <div className="flex items-center gap-1 border-r pr-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={undo}
          disabled={historyIndex <= 0}
          title="Undo"
        >
          <Undo2 className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={redo}
          disabled={historyIndex >= history.length - 1}
          title="Redo"
        >
          <Redo2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex items-center gap-1 border-l pl-2">
        {onImport && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onImport}
            title="Import"
          >
            <Upload className="h-4 w-4" />
          </Button>
        )}
        <Button
          variant={showGrid ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setShowGrid(!showGrid)}
          title="Toggle Grid"
        >
          <Grid3x3 className="h-4 w-4" />
        </Button>
        {hasSelection && selectedImages.length === 1 && (
          <Button
            variant={showAnnotations ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setShowAnnotations(!showAnnotations)}
            title="Toggle Annotations"
          >
            <MessageSquare className="h-4 w-4" />
          </Button>
        )}
        {onToggleMinimap && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleMinimap}
            title="Toggle Minimap"
          >
            <Map className="h-4 w-4" />
          </Button>
        )}
        {onToggleMeasurement && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleMeasurement}
            title="Measurement Tool"
          >
            <Ruler className="h-4 w-4" />
          </Button>
        )}
        {onToggleComparison && hasSelection && selectedImages.length >= 2 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleComparison}
            title="Compare Images"
          >
            <Split className="h-4 w-4" />
          </Button>
        )}
        {onToggleRegionComparison && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleRegionComparison}
            title="Compare Regions"
          >
            <Layers className="h-4 w-4" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={onSaveSession}
          title="Save Session"
        >
          <Save className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onExport}
          title="Export"
        >
          <Download className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" title="Fullscreen">
          <Maximize2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
