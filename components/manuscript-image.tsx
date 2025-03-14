'use client'

import type React from 'react'
import { useState, useRef, useCallback, useMemo } from 'react'
import { AnnotationPopup } from './annotation-popup'
import { IIIFImage } from '@/utils/iiif'
import { Button } from '@/components/ui/button'
import { ZoomIn, ZoomOut } from 'lucide-react'

interface Annotation {
  id: string
  type: 'editorial'
  x: number
  y: number
  width: number
  height: number
  content: string
  components?: {
    head?: {
      brokenArc?: boolean
      horizontallyExtended?: boolean
      looped?: boolean
      ruched?: boolean
      swellingTapering?: boolean
    }
    stem?: {
      crossed?: boolean
      extended?: boolean
      onBaseline?: boolean
    }
  }
}

interface ManuscriptImageProps {
  annotationsEnabled: boolean
  annotations: Annotation[]
  isCreatingAnnotation: boolean
  isMoveToolActive: boolean
  isDeleteMode: boolean
  onAnnotationCreated: (annotation: Annotation) => void
  onAnnotationUpdated: (annotation: Annotation) => void
  onAnnotationDeleted: (annotationId: string) => void
  zoom: number
  onZoomChange: (newZoom: number) => void
  iiifImageUrl: string
  selectedAllograph: Allograph | undefined
}

// Define the Allograph type
interface Allograph {
  id: string
  name: string
  // Add other properties as needed
}

export function ManuscriptImage({
  annotationsEnabled,
  annotations,
  isCreatingAnnotation,
  isMoveToolActive,
  isDeleteMode,
  onAnnotationCreated,
  onAnnotationUpdated,
  onAnnotationDeleted,
  zoom,
  onZoomChange: onZoomChangeProp,
  iiifImageUrl,
  selectedAllograph,
}: ManuscriptImageProps) {
  const [newAnnotation, setNewAnnotation] =
    useState<Partial<Annotation> | null>(null)
  const [selectedAnnotation, setSelectedAnnotation] =
    useState<Annotation | null>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState({ x: 0, y: 0 })
  const [viewportPosition, setViewportPosition] = useState({ x: 0, y: 0 })
  const [viewportOffset, setViewportOffset] = useState({ x: 0, y: 0 })
  const imageRef = useRef<HTMLImageElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const iiifImage = useMemo(() => new IIIFImage(iiifImageUrl), [iiifImageUrl])

  const getImageScale = useCallback(() => {
    return zoom <= 1 ? 1 : zoom
  }, [zoom])

  const getImageUrl = useCallback(() => {
    return zoom <= 1
      ? iiifImage.getScaledUrl(zoom)
      : iiifImage.getImageUrl({ size: 'max' })
  }, [iiifImage, zoom])

  const handleZoomChange = useCallback(
    (newZoom: number) => {
      if (containerRef.current && imageRef.current) {
        const container = containerRef.current
        const image = imageRef.current

        // Get the dimensions of the container and image
        const containerRect = container.getBoundingClientRect()
        const imageRect = image.getBoundingClientRect()

        // Calculate the center point of the image
        const imageCenterX = imageRect.width / 2
        const imageCenterY = imageRect.height / 2

        // Calculate the new offset to keep the center point at the center after zooming
        const newOffsetX =
          containerRect.width / 2 - (imageCenterX / zoom) * newZoom
        const newOffsetY =
          containerRect.height / 2 - (imageCenterY / zoom) * newZoom

        setViewportOffset({ x: newOffsetX, y: newOffsetY })
        onZoomChangeProp(newZoom)
      }
    },
    [zoom, onZoomChangeProp]
  )

  const handleZoomIn = useCallback(() => {
    handleZoomChange(Math.min(zoom * 1.2, 4))
  }, [zoom, handleZoomChange])

  const handleZoomOut = useCallback(() => {
    handleZoomChange(Math.max(zoom / 1.2, 0.5))
  }, [zoom, handleZoomChange])

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (isMoveToolActive) {
        setIsPanning(true)
        setPanStart({ x: e.clientX, y: e.clientY })
      } else if (
        isCreatingAnnotation &&
        imageRef.current &&
        (e.target === imageRef.current || e.target === containerRef.current)
      ) {
        const rect = imageRef.current.getBoundingClientRect()
        const x = ((e.clientX - rect.left) / rect.width) * 100
        const y = ((e.clientY - rect.top) / rect.height) * 100

        setIsDrawing(true)
        setNewAnnotation({
          x,
          y,
          width: 0,
          height: 0,
        })
      }
    },
    [isCreatingAnnotation, isMoveToolActive]
  )

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (isPanning && containerRef.current) {
        const dx = e.clientX - panStart.x
        const dy = e.clientY - panStart.y
        containerRef.current.scrollLeft -= dx
        containerRef.current.scrollTop -= dy
        setPanStart({ x: e.clientX, y: e.clientY })

        setViewportPosition((prev) => ({
          x: prev.x - dx,
          y: prev.y - dy,
        }))
      } else if (isDrawing && newAnnotation && imageRef.current) {
        const rect = imageRef.current.getBoundingClientRect()
        const width =
          ((e.clientX - rect.left) / rect.width) * 100 - newAnnotation.x!
        const height =
          ((e.clientY - rect.top) / rect.height) * 100 - newAnnotation.y!

        setNewAnnotation((prev) => ({
          ...prev,
          width,
          height,
        }))
      }
    },
    [newAnnotation, isDrawing, isPanning, panStart]
  )

  const handleMouseUp = useCallback(() => {
    if (isPanning) {
      setIsPanning(false)
    } else if (isDrawing && newAnnotation) {
      const annotation: Annotation = {
        id: Date.now().toString(),
        type: 'editorial',
        x: newAnnotation.x!,
        y: newAnnotation.y!,
        width: Math.abs(newAnnotation.width!),
        height: Math.abs(newAnnotation.height!),
        content: '',
        components: {
          head: {},
          stem: {},
        },
      }

      onAnnotationCreated(annotation)
      setNewAnnotation(null)
      setIsDrawing(false)
      setSelectedAnnotation(annotation)
    }
  }, [newAnnotation, isDrawing, isPanning, onAnnotationCreated])

  const handleContainerClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === containerRef.current || e.target === imageRef.current) {
        setSelectedAnnotation(null)
      }
    },
    []
  )

  const handleAnnotationClick = useCallback(
    (annotation: Annotation, e: React.MouseEvent) => {
      e.stopPropagation()
      if (isDeleteMode) {
        const confirmDelete = window.confirm(
          'Are you sure you want to delete this annotation?'
        )
        if (confirmDelete) {
          onAnnotationDeleted(annotation.id)
        }
      } else {
        setSelectedAnnotation(annotation)
      }
    },
    [isDeleteMode, onAnnotationDeleted]
  )

  const imageStyle = {
    transform: `scale(${getImageScale()}) translate(${viewportOffset.x}px, ${
      viewportOffset.y
    }px)`,
    transformOrigin: '0 0',
  }

  return (
    <div className='relative h-full w-full overflow-hidden'>
      <div
        ref={containerRef}
        className={`relative h-full w-full overflow-auto ${
          isCreatingAnnotation
            ? 'cursor-crosshair'
            : isMoveToolActive
            ? 'cursor-move'
            : isDeleteMode
            ? 'cursor-pointer'
            : 'cursor-default'
        }`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={handleContainerClick}
      >
        <div
          className='relative'
          style={{
            width: `${100 * zoom}%`,
            height: `${100 * zoom}%`,
          }}
        >
          <img
            ref={imageRef}
            src={getImageUrl() || '/placeholder.svg'}
            alt='Manuscript'
            className='w-full h-full object-contain'
            style={imageStyle}
            draggable='false'
          />
          {annotationsEnabled && (
            <>
              {annotations.map((annotation) => (
                <div
                  key={annotation.id}
                  className={`absolute border-2 border-blue-500 bg-blue-200 bg-opacity-30 cursor-pointer hover:border-blue-600 hover:bg-blue-300 hover:bg-opacity-40 transition-colors ${
                    isDeleteMode ? 'hover:bg-red-300 hover:border-red-600' : ''
                  }`}
                  style={{
                    left: `${annotation.x}%`,
                    top: `${annotation.y}%`,
                    width: `${annotation.width}%`,
                    height: `${annotation.height}%`,
                  }}
                  onClick={(e) => handleAnnotationClick(annotation, e)}
                />
              ))}
              {newAnnotation && isDrawing && (
                <div
                  className='absolute border-2 border-red-500 bg-red-200 bg-opacity-30'
                  style={{
                    left: `${newAnnotation.x!}%`,
                    top: `${newAnnotation.y!}%`,
                    width: `${Math.abs(newAnnotation.width!)}%`,
                    height: `${Math.abs(newAnnotation.height!)}%`,
                  }}
                />
              )}
              {selectedAnnotation && !isDeleteMode && (
                <AnnotationPopup
                  annotation={{ ...selectedAnnotation, selectedAllograph }}
                  onClose={() => setSelectedAnnotation(null)}
                  onUpdate={(updated) => {
                    onAnnotationUpdated(updated)
                    setSelectedAnnotation(updated)
                  }}
                  style={{
                    left: `${
                      selectedAnnotation.x + Math.abs(selectedAnnotation.width)
                    }%`,
                    top: `${selectedAnnotation.y}%`,
                  }}
                />
              )}
            </>
          )}
        </div>
      </div>
      <div className='absolute left-4 top-4 flex flex-col gap-2'>
        <Button variant='secondary' size='icon' onClick={handleZoomIn}>
          <ZoomIn className='h-4 w-4' />
        </Button>
        <Button variant='secondary' size='icon' onClick={handleZoomOut}>
          <ZoomOut className='h-4 w-4' />
        </Button>
      </div>
    </div>
  )
}
