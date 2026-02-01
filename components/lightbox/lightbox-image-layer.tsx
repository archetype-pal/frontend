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

function clampPosition(
  x: number,
  y: number,
  containerRect: DOMRect,
  imageSize: { width: number; height: number }
) {
  return {
    x: Math.max(0, Math.min(x, containerRect.width - imageSize.width)),
    y: Math.max(0, Math.min(y, containerRect.height - imageSize.height)),
  }
}

export function LightboxImageLayer({ images }: LightboxImageLayerProps) {
  const { selectedImageIds, updateImage } = useLightboxStore()
  const [draggedImage, setDraggedImage] = React.useState<string | null>(null)
  const [dragPosition, setDragPosition] = React.useState<{ x: number; y: number } | null>(null)
  const dragRef = React.useRef<{
    imageId: string | null
    offset: { x: number; y: number }
    lastPosition: { x: number; y: number } | null
  }>({ imageId: null, offset: { x: 0, y: 0 }, lastPosition: null })
  const containerRef = React.useRef<HTMLDivElement>(null)

  const handleMouseDown = (e: React.MouseEvent, imageId: string) => {
    e.preventDefault()
    e.stopPropagation()
    const image = images.find((img) => img.id === imageId)
    if (!image) return

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    dragRef.current = {
      imageId,
      offset: { x: e.clientX - rect.left, y: e.clientY - rect.top },
      lastPosition: null,
    }
    setDraggedImage(imageId)
    setDragPosition(null)

    const handleMouseMove = (e: MouseEvent) => {
      if (dragRef.current.imageId !== imageId || !containerRef.current) return
      const containerRect = containerRef.current.getBoundingClientRect()
      const currentImage = images.find((img) => img.id === imageId)
      if (!currentImage) return

      const rawX = e.clientX - containerRect.left - dragRef.current.offset.x
      const rawY = e.clientY - containerRect.top - dragRef.current.offset.y
      const pos = clampPosition(rawX, rawY, containerRect, currentImage.size)
      dragRef.current.lastPosition = pos
      setDragPosition(pos)
    }

    const handleMouseUp = () => {
      const { imageId: commitId, lastPosition: commitPos } = dragRef.current
      dragRef.current = { imageId: null, offset: { x: 0, y: 0 }, lastPosition: null }
      setDraggedImage(null)
      setDragPosition(null)
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)

      if (commitId && commitPos != null) {
        const currentImage = images.find((img) => img.id === commitId)
        if (currentImage) {
          useLightboxStore.getState().saveHistory()
          updateImage(commitId, {
            position: { ...currentImage.position, ...commitPos },
          })
        }
      }
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
      if (!e.shiftKey && !e.ctrlKey && !e.metaKey) useLightboxStore.getState().deselectAll()
      selectImage(imageId)
    }
  }

  return (
    <div ref={containerRef} className="lightbox-container relative w-full h-full overflow-hidden">
      {images.map((image) => {
        const isSelected = selectedImageIds.has(image.id)
        const isDragging = draggedImage === image.id
        const displayPosition =
          isDragging && dragPosition != null ? dragPosition : image.position

        const transformStyle: React.CSSProperties = {
          position: 'absolute',
          left: `${displayPosition.x}px`,
          top: `${displayPosition.y}px`,
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
              'border-2 group',
              isDragging ? 'transition-none' : 'transition-all',
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
            {isSelected && <LightboxImageResize image={image} />}
          </div>
        )
      })}
    </div>
  )
}
