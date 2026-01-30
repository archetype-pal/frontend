'use client'

import * as React from 'react'
import NextImage from 'next/image'
import type { LightboxImage } from '@/lib/lightbox-db'
import { useLightboxStore } from '@/stores/lightbox-store'
import { cn } from '@/lib/utils'
import { LightboxImageResize } from './lightbox-image-resize'

interface LightboxImageLayerProps {
  images: LightboxImage[]
}

export function LightboxImageLayer({ images }: LightboxImageLayerProps) {
  const { selectedImageIds, updateImage } = useLightboxStore()
  const [draggedImage, setDraggedImage] = React.useState<string | null>(null)
  const dragStateRef = React.useRef<{
    imageId: string | null
    offset: { x: number; y: number }
  }>({ imageId: null, offset: { x: 0, y: 0 } })
  const containerRef = React.useRef<HTMLDivElement>(null)

  const handleMouseDown = (e: React.MouseEvent, imageId: string) => {
    e.preventDefault()
    e.stopPropagation()
    
    const image = images.find((img) => img.id === imageId)
    if (!image) return

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const startX = e.clientX - rect.left
    const startY = e.clientY - rect.top

    dragStateRef.current = {
      imageId,
      offset: { x: startX, y: startY },
    }
    setDraggedImage(imageId)

    const handleMouseMove = (e: MouseEvent) => {
      if (dragStateRef.current.imageId !== imageId) return
      
      const container = containerRef.current
      if (!container) return
      
      const containerRect = container.getBoundingClientRect()
      const newX = e.clientX - containerRect.left - dragStateRef.current.offset.x
      const newY = e.clientY - containerRect.top - dragStateRef.current.offset.y

      const currentImage = images.find((img) => img.id === imageId)
      if (!currentImage) return

      updateImage(imageId, {
        position: {
          ...currentImage.position,
          x: Math.max(0, Math.min(newX, containerRect.width - currentImage.size.width)),
          y: Math.max(0, Math.min(newY, containerRect.height - currentImage.size.height)),
        },
      })
    }

    const handleMouseUp = () => {
      dragStateRef.current = { imageId: null, offset: { x: 0, y: 0 } }
      setDraggedImage(null)
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }

  const handleImageClick = (e: React.MouseEvent, imageId: string) => {
    e.stopPropagation()
    const { selectImage, deselectImage, selectedImageIds } = useLightboxStore.getState()
    
    if (selectedImageIds.has(imageId)) {
      deselectImage(imageId)
    } else {
      if (!e.shiftKey && !e.ctrlKey && !e.metaKey) {
        // Deselect all if not holding modifier key
        useLightboxStore.getState().deselectAll()
      }
      selectImage(imageId)
    }
  }

  return (
    <div ref={containerRef} className="lightbox-container relative w-full h-full overflow-hidden">
      {images.map((image) => {
        const isSelected = selectedImageIds.has(image.id)
        const isDragging = draggedImage === image.id

        // Apply transforms
        const transformStyle: React.CSSProperties = {
          position: 'absolute',
          left: `${image.position.x}px`,
          top: `${image.position.y}px`,
          width: `${image.size.width}px`,
          height: `${image.size.height}px`,
          zIndex: image.position.zIndex,
          opacity: image.transform.opacity,
          transform: `
            rotate(${image.transform.rotation}deg)
            scaleX(${image.transform.flipX ? -1 : 1})
            scaleY(${image.transform.flipY ? -1 : 1})
          `,
          filter: `
            brightness(${image.transform.brightness}%)
            contrast(${image.transform.contrast}%)
            ${image.transform.grayscale ? 'grayscale(100%)' : ''}
          `,
          cursor: isDragging ? 'grabbing' : 'grab',
          userSelect: 'none',
        }

        return (
          <div
            key={image.id}
            style={transformStyle}
            className={cn(
              'border-2 transition-all group',
              isSelected
                ? 'border-blue-500 shadow-lg'
                : 'border-transparent hover:border-gray-300'
            )}
            onMouseDown={(e) => handleMouseDown(e, image.id)}
            onClick={(e) => handleImageClick(e, image.id)}
          >
            <div className="relative w-full h-full">
              {image.imageUrl ? (
                <NextImage
                  src={image.imageUrl}
                  alt={image.metadata.shelfmark || image.metadata.locus || 'Image'}
                  fill
                  className="object-contain"
                  unoptimized
                  draggable={false}
                />
              ) : (
                <div className="w-full h-full bg-gray-200 flex items-center justify-center text-sm text-gray-500">
                  No image
                </div>
              )}
              {(image.metadata.shelfmark || image.metadata.locus) && (
                <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-1 truncate pointer-events-none">
                  {image.metadata.locus || image.metadata.shelfmark}
                </div>
              )}
            </div>
            {/* Resize handles - only show when selected */}
            {isSelected && (
              <LightboxImageResize image={image} />
            )}
          </div>
        )
      })}
    </div>
  )
}
