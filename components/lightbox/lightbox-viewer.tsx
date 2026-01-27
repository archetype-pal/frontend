'use client'

import * as React from 'react'
import { useLightboxStore } from '@/stores/lightbox-store'
import { LightboxImageLayer } from './lightbox-image-layer'
import { LightboxMinimap } from './lightbox-minimap'
import { LightboxGridOverlay } from './lightbox-grid-overlay'
import { LightboxAnnotations } from './lightbox-annotations'

interface LightboxViewerProps {
  showMinimap?: boolean
}

export function LightboxViewer({ showMinimap = false }: LightboxViewerProps = {}) {
  const { currentWorkspaceId, images, zoom, pan, showAnnotations, showGrid, selectedImageIds } = useLightboxStore()
  const containerRef = React.useRef<HTMLDivElement>(null)
  
  const workspaceImages = React.useMemo(() => {
    if (!currentWorkspaceId) return []
    return Array.from(images.values()).filter(
      (img) => img.workspaceId === currentWorkspaceId
    )
  }, [currentWorkspaceId, images])

  if (!currentWorkspaceId) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">No workspace selected</p>
          <p className="text-sm text-muted-foreground">
            Create a new workspace or select an existing one from the sidebar
          </p>
        </div>
      </div>
    )
  }

  if (workspaceImages.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">No images in workspace</p>
          <p className="text-sm text-muted-foreground">
            Add images from your collection or search results
          </p>
        </div>
      </div>
    )
  }

  const selectedImage = selectedImageIds.size === 1 
    ? workspaceImages.find(img => selectedImageIds.has(img.id))
    : null

  return (
    <div ref={containerRef} className="relative h-full w-full bg-gray-100">
      {/* Grid Overlay */}
      {showGrid && <LightboxGridOverlay />}
      
      {/* Image layer */}
      {workspaceImages.length > 0 && (
        <div className="absolute inset-0">
          <LightboxImageLayer images={workspaceImages} />
        </div>
      )}
      
      {/* Annotations - show for single selected image */}
      {showAnnotations && selectedImage && (
        <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 10 }}>
          <div className="w-full h-full pointer-events-auto">
            <LightboxAnnotations
              image={selectedImage}
              onAnnotationChange={() => {
                // Refresh annotations if needed
              }}
            />
          </div>
        </div>
      )}
      
      {/* Minimap */}
      {showMinimap && <LightboxMinimap containerRef={containerRef} />}
    </div>
  )
}
