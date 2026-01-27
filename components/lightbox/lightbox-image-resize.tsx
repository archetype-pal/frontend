'use client'

import * as React from 'react'
import { useLightboxStore } from '@/stores/lightbox-store'
import type { LightboxImage } from '@/lib/lightbox-db'

interface LightboxImageResizeProps {
  image: LightboxImage
  onResize?: (width: number, height: number) => void
}

export function LightboxImageResize({ image, onResize }: LightboxImageResizeProps) {
  const [isResizing, setIsResizing] = React.useState(false)
  const [resizeHandle, setResizeHandle] = React.useState<'se' | 'sw' | 'ne' | 'nw' | null>(null)
  const { updateImage } = useLightboxStore()

  const handleMouseDown = (e: React.MouseEvent, handle: 'se' | 'sw' | 'ne' | 'nw') => {
    e.preventDefault()
    e.stopPropagation()
    setIsResizing(true)
    setResizeHandle(handle)

    const startX = e.clientX
    const startY = e.clientY
    const startWidth = image.size.width
    const startHeight = image.size.height
    const startLeft = image.position.x
    const startTop = image.position.y

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - startX
      const deltaY = e.clientY - startY

      let newWidth = startWidth
      let newHeight = startHeight
      let newX = startLeft
      let newY = startTop

      // Calculate new size based on handle
      if (handle === 'se') {
        // Southeast - resize bottom-right
        newWidth = Math.max(100, startWidth + deltaX)
        newHeight = Math.max(100, startHeight + deltaY)
      } else if (handle === 'sw') {
        // Southwest - resize bottom-left
        newWidth = Math.max(100, startWidth - deltaX)
        newHeight = Math.max(100, startHeight + deltaY)
        newX = startLeft + (startWidth - newWidth)
      } else if (handle === 'ne') {
        // Northeast - resize top-right
        newWidth = Math.max(100, startWidth + deltaX)
        newHeight = Math.max(100, startHeight - deltaY)
        newY = startTop + (startHeight - newHeight)
      } else if (handle === 'nw') {
        // Northwest - resize top-left
        newWidth = Math.max(100, startWidth - deltaX)
        newHeight = Math.max(100, startHeight - deltaY)
        newX = startLeft + (startWidth - newWidth)
        newY = startTop + (startHeight - newHeight)
      }

      // Maintain aspect ratio
      const aspectRatio = startWidth / startHeight
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        newHeight = newWidth / aspectRatio
        if (handle === 'sw' || handle === 'nw') {
          newY = startTop + (startHeight - newHeight)
        }
      } else {
        newWidth = newHeight * aspectRatio
        if (handle === 'sw' || handle === 'nw') {
          newX = startLeft + (startWidth - newWidth)
        }
      }

      updateImage(image.id, {
        size: { width: newWidth, height: newHeight },
        position: { ...image.position, x: newX, y: newY },
      })
    }

    const handleMouseUp = () => {
      setIsResizing(false)
      setResizeHandle(null)
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }

  return (
    <>
      {/* Resize handles */}
      <div
        className="absolute -bottom-1 -right-1 w-4 h-4 bg-blue-500 border-2 border-white rounded cursor-se-resize z-10 opacity-0 group-hover:opacity-100 transition-opacity"
        onMouseDown={(e) => handleMouseDown(e, 'se')}
      />
      <div
        className="absolute -bottom-1 -left-1 w-4 h-4 bg-blue-500 border-2 border-white rounded cursor-sw-resize z-10 opacity-0 group-hover:opacity-100 transition-opacity"
        onMouseDown={(e) => handleMouseDown(e, 'sw')}
      />
      <div
        className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 border-2 border-white rounded cursor-ne-resize z-10 opacity-0 group-hover:opacity-100 transition-opacity"
        onMouseDown={(e) => handleMouseDown(e, 'ne')}
      />
      <div
        className="absolute -top-1 -left-1 w-4 h-4 bg-blue-500 border-2 border-white rounded cursor-nw-resize z-10 opacity-0 group-hover:opacity-100 transition-opacity"
        onMouseDown={(e) => handleMouseDown(e, 'nw')}
      />
    </>
  )
}
