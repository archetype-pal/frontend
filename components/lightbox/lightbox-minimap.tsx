'use client'

import * as React from 'react'
import { useWorkspaceImages } from '@/stores/lightbox-store'
import { cn } from '@/lib/utils'

interface LightboxMinimapProps {
  containerRef: React.RefObject<HTMLDivElement | null>
  className?: string
}

export function LightboxMinimap({ containerRef, className }: LightboxMinimapProps) {
  const workspaceImages = useWorkspaceImages()
  const [viewportRect, setViewportRect] = React.useState<DOMRect | null>(null)

  React.useEffect(() => {
    if (!containerRef.current) return

    const updateViewport = () => {
      if (containerRef.current) {
        setViewportRect(containerRef.current.getBoundingClientRect())
      }
    }

    updateViewport()
    window.addEventListener('resize', updateViewport)
    window.addEventListener('scroll', updateViewport)

    return () => {
      window.removeEventListener('resize', updateViewport)
      window.removeEventListener('scroll', updateViewport)
    }
  }, [containerRef])

  if (workspaceImages.length === 0 || !viewportRect) {
    return null
  }

  // Calculate bounds of all images
  const bounds = workspaceImages.reduce(
    (acc, img) => {
      return {
        minX: Math.min(acc.minX, img.position.x),
        minY: Math.min(acc.minY, img.position.y),
        maxX: Math.max(acc.maxX, img.position.x + img.size.width),
        maxY: Math.max(acc.maxY, img.position.y + img.size.height),
      }
    },
    {
      minX: Infinity,
      minY: Infinity,
      maxX: -Infinity,
      maxY: -Infinity,
    }
  )

  const contentWidth = bounds.maxX - bounds.minX
  const contentHeight = bounds.maxY - bounds.minY
  const scaleX = 200 / Math.max(contentWidth, viewportRect.width)
  const scaleY = 150 / Math.max(contentHeight, viewportRect.height)
  const scale = Math.min(scaleX, scaleY)

  return (
    <div
      className={cn(
        'absolute bottom-4 right-4 w-[200px] h-[150px] bg-white/90 border-2 border-gray-300 rounded-lg shadow-lg p-2 z-50',
        className
      )}
    >
      <div className="text-xs font-semibold mb-1 text-gray-700">Overview</div>
      <div className="relative w-full h-full border border-gray-200 rounded overflow-hidden">
        {/* Content bounds */}
        <svg className="w-full h-full" viewBox={`0 0 ${contentWidth * scale} ${contentHeight * scale}`}>
          {/* Images as rectangles */}
          {workspaceImages.map((image) => {
            const x = (image.position.x - bounds.minX) * scale
            const y = (image.position.y - bounds.minY) * scale
            const width = image.size.width * scale
            const height = image.size.height * scale

            return (
              <rect
                key={image.id}
                x={x}
                y={y}
                width={width}
                height={height}
                fill="rgba(59, 130, 246, 0.3)"
                stroke="rgba(59, 130, 246, 0.8)"
                strokeWidth="1"
              />
            )
          })}
          
          {/* Viewport indicator: container-relative (0,0) to (width, height) in content space */}
          <rect
            x={(0 - bounds.minX) * scale}
            y={(0 - bounds.minY) * scale}
            width={viewportRect.width * scale}
            height={viewportRect.height * scale}
            fill="none"
            stroke="rgba(239, 68, 68, 0.8)"
            strokeWidth="2"
            strokeDasharray="4 4"
          />
        </svg>
      </div>
    </div>
  )
}
