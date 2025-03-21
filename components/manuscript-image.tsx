'use client'

import type React from 'react'
import { useState, useRef, useEffect, useCallback } from 'react'
import { AnnotationPopup } from './annotation-popup'
import { IIIFImage } from '@/utils/iiif'
import { toast } from 'sonner'
import { LoadingState } from './loading-state'
import { ImageFallback } from './image-fallback'
import Script from 'next/script'

// Define the window interface with OpenSeadragon
interface WindowWithOpenSeadragon extends Window {
  OpenSeadragon?: any
}

declare const window: WindowWithOpenSeadragon

// Types
interface ImageRect {
  x: number
  y: number
  width: number
  height: number
}

interface Annotation {
  id: string
  type: string
  imageRect: ImageRect
  content: string
  selectedAllograph?: any
  components?: Record<string, Record<string, boolean>>
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
  selectedAllograph: any | undefined
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
  onZoomChange,
  iiifImageUrl,
  selectedAllograph,
}: ManuscriptImageProps) {
  // State
  const [newAnnotation, setNewAnnotation] =
    useState<Partial<Annotation> | null>(null)
  const [selectedAnnotation, setSelectedAnnotation] =
    useState<Annotation | null>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [viewerReady, setViewerReady] = useState(false)
  const [osdLoaded, setOsdLoaded] = useState(false)
  const [startPoint, setStartPoint] = useState({ x: 0, y: 0 })
  const [imageInfo, setImageInfo] = useState<{
    width: number
    height: number
  } | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [imageUrl, setImageUrl] = useState<string>(iiifImageUrl)
  const [viewportBounds, setViewportBounds] = useState<any>(null)
  const [fallbackIndex, setFallbackIndex] = useState(-1) // -1 means use the original URL
  const [selectedAnnotationPosition, setSelectedAnnotationPosition] = useState<{
    left: number
    top: number
    width: number
    height: number
  } | null>(null)

  // Refs
  const containerRef = useRef<HTMLDivElement>(null)
  const osdInstance = useRef<any>(null)
  const originalTrackerClickHandler = useRef<any>(null)
  const annotationLayerRef = useRef<HTMLDivElement>(null)

  // Use a fallback image if needed
  useEffect(() => {
    setImageUrl(iiifImageUrl)
    // if (fallbackIndex === -1) {
    //   setImageUrl(iiifImageUrl)
    // } else if (fallbackIndex < FALLBACK_IMAGES.length) {
    //   // setImageUrl(FALLBACK_IMAGES[fallbackIndex])
    // } else {
    //   setLoadError('Failed to load image after trying all fallbacks')
    // }
  }, [iiifImageUrl, fallbackIndex])

  // Process the image URL to ensure it's a direct image URL
  useEffect(() => {
    try {
      // Check if the URL is likely a IIIF URL
      const isIiifUrl =
        imageUrl.includes('/iiif/') ||
        imageUrl.includes('info.json') ||
        imageUrl.includes('/full/')

      if (isIiifUrl) {
        // For IIIF URLs, create the IIIFImage instance and get the direct URL
        const iiifImage = new IIIFImage(imageUrl)

        // Check if getFullImageUrl exists and is a function
        if (typeof iiifImage?.getImageUrl === 'function') {
          const directImageUrl = iiifImage?.getImageUrl()
          setImageUrl(directImageUrl)
        } else {
          console.error('getFullImageUrl method is not available')
          // Try to construct a IIIF URL manually if the method isn't available
          if (imageUrl.includes('/full/')) {
            // Already a full URL, use it as is
            console.log('Using existing IIIF URL:', imageUrl)
          } else {
            // Try to construct a IIIF URL
            let processedImageUrl
            if (imageUrl.endsWith('/info.json')) {
              processedImageUrl = imageUrl.replace('/info.json', '')
            }
            const constructedUrl = `${processedImageUrl}/full/max/0/default.jpg`
            setImageUrl(constructedUrl)
          }
        }
      } else {
        console.log('Not using IIIF for non-IIIF URL:', imageUrl)
      }
    } catch (error) {
      console.error('Error processing image URL:', error)
      // If there's an error, try to use the URL as is
    }
  }, [imageUrl])

  // Initialize OpenSeadragon viewer
  useEffect(() => {
    if (!containerRef.current || osdInstance.current || !osdLoaded || !imageUrl)
      return

    const initializeViewer = (url: string) => {
      try {
        console.log('Initializing viewer with URL:', url)
        osdInstance.current = window.OpenSeadragon({
          element: containerRef.current,
          tileSources: {
            type: 'image',
            url: url,
            crossOriginPolicy: 'Anonymous',
            buildPyramid: false,
          },
          prefixUrl:
            'https://cdn.jsdelivr.net/npm/openseadragon@2.4/build/openseadragon/images/',
          showNavigator: true,
          navigatorPosition: 'BOTTOM_RIGHT',
          animationTime: 0.5,
          blendTime: 0.1,
          constrainDuringPan: true,
          maxZoomPixelRatio: 2,
          minZoomLevel: 0.5,
          maxZoomLevel: 10,
          visibilityRatio: 1,
          zoomPerScroll: 1.2,
          crossOriginPolicy: 'Anonymous',
        })

        // Add error handler for the viewer
        osdInstance.current.addHandler('open-failed', (event: any) => {
          console.error('Failed to open image:', event)

          // // Try the next fallback image
          // if (fallbackIndex < FALLBACK_IMAGES.length) {
          //   console.log('Trying fallback image:', fallbackIndex + 1)
          //   setFallbackIndex((prev) => prev + 1)
          // } else {
          //   setLoadError(
          //     'Failed to load image. The image may not be accessible due to CORS restrictions.'
          //   )
          //   setIsLoading(false)
          // }
        })

        // Use standard event handler
        osdInstance.current.addHandler('open', (event: any) => {
          console.log('OpenSeadragon viewer is ready')
          setViewerReady(true)
          setIsLoading(false)

          // Get image dimensions from the tiledImage
          try {
            const tiledImage = osdInstance.current.world.getItemAt(0)
            if (tiledImage) {
              const bounds = tiledImage.getBounds()
              setImageInfo({
                width: bounds.width,
                height: bounds.height,
              })
              setViewportBounds(osdInstance.current.viewport.getBounds())
            }
          } catch (error) {
            console.error('Error getting image dimensions:', error)
            setImageInfo({
              width: 1000,
              height: 1000,
            })
          }
        })

        // Add handler for zoom and pan events to update annotation positions
        osdInstance.current.addHandler('animation', () => {
          if (osdInstance.current && osdInstance.current.viewport) {
            setViewportBounds(osdInstance.current.viewport.getBounds())
          }
        })

        // Store the original tracker click handler
        const tracker = osdInstance.current.innerTracker
        if (tracker) {
          originalTrackerClickHandler.current = tracker.clickHandler
        }
      } catch (error) {
        console.error('Error initializing OpenSeadragon:', error)
        toast.error('Failed to initialize viewer. Please try again later.')
        setIsLoading(false)
      }
    }

    try {
      // Make sure OpenSeadragon is available
      if (!window.OpenSeadragon) {
        console.error('OpenSeadragon is not available on window')
        return
      }

      // Initialize directly without pre-check
      initializeViewer(imageUrl)
    } catch (error) {
      console.error('Error initializing OpenSeadragon:', error)
      toast.error('Failed to initialize viewer. Please try again later.')
      setIsLoading(false)
    }

    return () => {
      if (osdInstance.current) {
        try {
          osdInstance.current.destroy()
        } catch (error) {
          console.error('Error destroying OpenSeadragon:', error)
        }
        osdInstance.current = null
      }
    }
  }, [imageUrl, osdLoaded, fallbackIndex])

  // Update OpenSeadragon's zoom when the zoom prop changes
  useEffect(() => {
    if (!osdInstance.current || !viewerReady) return

    try {
      const currentZoom = osdInstance.current.viewport.getZoom()
      const targetZoom = zoom

      if (Math.abs(currentZoom - targetZoom) > 0.1) {
        osdInstance.current.viewport.zoomTo(targetZoom)
      }
    } catch (error) {
      console.error('Error updating zoom:', error)
    }
  }, [zoom, viewerReady])

  // Update tracker behavior when tools change
  useEffect(() => {
    if (!osdInstance.current || !viewerReady) return

    const tracker = osdInstance.current.innerTracker
    if (tracker) {
      tracker.clickHandler = isCreatingAnnotation
        ? (event: any) => true // In annotation mode, handle clicks ourselves
        : originalTrackerClickHandler.current // In move mode, use original handler
    }
  }, [isCreatingAnnotation, viewerReady])

  // Convert screen coordinates to normalized image coordinates (0-1)
  const screenToImageCoords = useCallback(
    (screenX: number, screenY: number) => {
      if (!osdInstance.current || !viewerReady || !imageInfo) {
        return { x: 0, y: 0 }
      }

      try {
        // Get the position of the viewer element
        const viewerElement = osdInstance.current.element
        const viewerRect = viewerElement.getBoundingClientRect()

        // Calculate the position within the viewer element
        const viewerX = screenX - viewerRect.left
        const viewerY = screenY - viewerRect.top

        // Convert viewer element coordinates to viewport coordinates
        const viewportPoint =
          osdInstance.current.viewport.viewerElementToViewportCoordinates(
            new window.OpenSeadragon.Point(viewerX, viewerY)
          )

        // Convert viewport coordinates to image coordinates
        const imagePoint =
          osdInstance.current.viewport.viewportToImageCoordinates(viewportPoint)

        // Normalize to 0-1 range
        return {
          x: imagePoint.x / imageInfo.width,
          y: imagePoint.y / imageInfo.height,
        }
      } catch (error) {
        console.error('Error converting screen to image coordinates:', error)
        return { x: 0, y: 0 }
      }
    },
    [viewerReady, imageInfo]
  )

  // Convert normalized image coordinates (0-1) to viewport coordinates
  const imageToViewportCoords = useCallback(
    (imageX: number, imageY: number) => {
      if (!osdInstance.current || !viewerReady || !imageInfo) {
        return { x: 0, y: 0 }
      }

      try {
        // Convert normalized coordinates (0-1) to actual image coordinates
        const actualImageX = imageX * imageInfo.width
        const actualImageY = imageY * imageInfo.height

        // Create image point
        const imagePoint = new window.OpenSeadragon.Point(
          actualImageX,
          actualImageY
        )

        // Convert image point to viewport point
        const viewportPoint =
          osdInstance.current.viewport.imageToViewportCoordinates(imagePoint)

        return {
          x: viewportPoint.x,
          y: viewportPoint.y,
        }
      } catch (error) {
        console.error('Error converting image to viewport coordinates:', error)
        return { x: 0, y: 0 }
      }
    },
    [viewerReady, imageInfo]
  )

  // Get viewport rectangle for an annotation
  const getAnnotationViewportRect = useCallback(
    (annotation: Annotation) => {
      if (!osdInstance.current || !viewerReady) {
        return { x: 0, y: 0, width: 0, height: 0 }
      }

      try {
        const { imageRect } = annotation

        // Convert top-left corner from image to viewport coordinates
        const topLeft = imageToViewportCoords(imageRect.x, imageRect.y)

        // Convert bottom-right corner from image to viewport coordinates
        const bottomRight = imageToViewportCoords(
          imageRect.x + imageRect.width,
          imageRect.y + imageRect.height
        )

        // Calculate width and height in viewport coordinates
        const width = bottomRight.x - topLeft.x
        const height = bottomRight.y - topLeft.y

        return {
          x: topLeft.x,
          y: topLeft.y,
          width,
          height,
        }
      } catch (error) {
        console.error('Error calculating annotation viewport rectangle:', error)
        return { x: 0, y: 0, width: 0, height: 0 }
      }
    },
    [imageToViewportCoords, viewerReady]
  )

  // Convert viewport rectangle to screen coordinates
  const viewportRectToScreenRect = useCallback(
    (viewportRect: { x: number; y: number; width: number; height: number }) => {
      if (!osdInstance.current || !viewerReady) {
        return { left: 0, top: 0, width: 0, height: 0 }
      }

      try {
        // Convert viewport coordinates to viewer element coordinates
        const topLeft =
          osdInstance.current.viewport.viewportToViewerElementCoordinates(
            new window.OpenSeadragon.Point(viewportRect.x, viewportRect.y)
          )

        const bottomRight =
          osdInstance.current.viewport.viewportToViewerElementCoordinates(
            new window.OpenSeadragon.Point(
              viewportRect.x + viewportRect.width,
              viewportRect.y + viewportRect.height
            )
          )

        // Calculate position and size relative to the viewer element
        const left = Math.round(topLeft.x)
        const top = Math.round(topLeft.y)
        const width = Math.round(bottomRight.x - topLeft.x)
        const height = Math.round(bottomRight.y - topLeft.y)

        return { left, top, width, height }
      } catch (error) {
        console.error('Error converting viewport to screen coordinates:', error)
        return { left: 0, top: 0, width: 0, height: 0 }
      }
    },
    [viewerReady]
  )

  // Handle mouse events for drawing annotations
  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!isCreatingAnnotation || !viewerReady) return

      // When in annotation mode, prevent the event from reaching OpenSeadragon
      e.preventDefault()
      e.stopPropagation()

      try {
        console.log('Starting annotation creation')
        // Convert screen coordinates to image coordinates
        const imageCoords = screenToImageCoords(e.clientX, e.clientY)

        setIsDrawing(true)
        setStartPoint(imageCoords)
        setNewAnnotation({
          imageRect: {
            x: imageCoords.x,
            y: imageCoords.y,
            width: 0,
            height: 0,
          },
        })
      } catch (error) {
        console.error('Error in mouse down handler:', error)
      }
    },
    [isCreatingAnnotation, viewerReady, screenToImageCoords]
  )

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!isDrawing || !newAnnotation || !viewerReady) return
      e.preventDefault()
      e.stopPropagation()

      try {
        // Convert screen coordinates to image coordinates
        const currentImageCoords = screenToImageCoords(e.clientX, e.clientY)

        // Calculate width and height in image coordinates
        const width = currentImageCoords.x - startPoint.x
        const height = currentImageCoords.y - startPoint.y

        // Update annotation with new dimensions
        setNewAnnotation((prev) => ({
          ...prev,
          imageRect: {
            x: startPoint.x,
            y: startPoint.y,
            width,
            height,
          },
        }))
      } catch (error) {
        console.error('Error in mouse move handler:', error)
      }
    },
    [isDrawing, newAnnotation, viewerReady, screenToImageCoords, startPoint]
  )

  const handleMouseUp = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (
        !isDrawing ||
        !newAnnotation ||
        !viewerReady ||
        !newAnnotation.imageRect
      )
        return

      e.preventDefault()
      e.stopPropagation()

      console.log('Finishing annotation creation')

      try {
        // Normalize the rectangle (handle negative width/height)
        let { x, y, width, height } = newAnnotation.imageRect

        if (width < 0) {
          x = x + width
          width = Math.abs(width)
        }

        if (height < 0) {
          y = y + height
          height = Math.abs(height)
        }

        // Only create annotation if it has some size
        if (width > 0.001 && height > 0.001) {
          const annotation: Annotation = {
            id: Date.now().toString(),
            type: 'editorial',
            imageRect: { x, y, width, height },
            content: '',
            selectedAllograph,
            components: {},
          }

          console.log('Creating annotation:', annotation)
          onAnnotationCreated(annotation)
          setSelectedAnnotation(annotation)
        }
      } catch (error) {
        console.error('Error in mouse up handler:', error)
      }

      setIsDrawing(false)
      setNewAnnotation(null)
    },
    [
      isDrawing,
      newAnnotation,
      selectedAllograph,
      viewerReady,
      onAnnotationCreated,
    ]
  )

  const handleAnnotationClick = useCallback(
    (
      annotation: Annotation,
      e: React.MouseEvent,
      position: { left: number; top: number; width: number; height: number }
    ) => {
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
        setSelectedAnnotationPosition(position)
      }
    },
    [isDeleteMode, onAnnotationDeleted]
  )

  const handleRetryLoad = useCallback(() => {
    setIsLoading(true)
    setLoadError(null)

    // Try the next fallback image
    // if (fallbackIndex < FALLBACK_IMAGES.length - 1) {
    //   setFallbackIndex((prev) => prev + 1)
    // } else {
    //   // Reset to the original image
    //   setFallbackIndex(-1)
    // }

    if (osdInstance.current) {
      try {
        osdInstance.current.destroy()
      } catch (error) {
        console.error('Error destroying OpenSeadragon:', error)
      }
      osdInstance.current = null
    }
  }, [fallbackIndex])

  // Render annotation boxes
  const renderAnnotationBoxes = useCallback(() => {
    if (!annotationsEnabled || !viewerReady || !osdInstance.current) return null

    return annotations.map((annotation) => {
      // Convert annotation from image coordinates to viewport coordinates
      const viewportRect = getAnnotationViewportRect(annotation)

      // Convert viewport coordinates to screen coordinates
      const { left, top, width, height } =
        viewportRectToScreenRect(viewportRect)

      return (
        <div
          key={annotation.id}
          className={`absolute border-2 border-blue-500 bg-blue-200 bg-opacity-30 cursor-pointer hover:border-blue-600 hover:bg-blue-300 hover:bg-opacity-40 transition-colors ${
            isDeleteMode ? 'hover:bg-red-300 hover:border-red-600' : ''
          }`}
          style={{
            left: `${left}px`,
            top: `${top}px`,
            width: `${width}px`,
            height: `${height}px`,
            pointerEvents: 'auto',
          }}
          onClick={(e) =>
            handleAnnotationClick(annotation, e, { left, top, width, height })
          }
        />
      )
    })
  }, [
    annotationsEnabled,
    viewerReady,
    annotations,
    getAnnotationViewportRect,
    viewportRectToScreenRect,
    isDeleteMode,
    handleAnnotationClick,
    viewportBounds, // Add this dependency to ensure annotations update when viewport changes
  ])

  // Render the annotation being drawn
  const renderDrawingAnnotation = useCallback(() => {
    if (
      !isDrawing ||
      !newAnnotation ||
      !newAnnotation.imageRect ||
      !viewerReady ||
      !osdInstance.current
    )
      return null

    // Convert the new annotation from image coordinates to viewport coordinates
    const { x, y, width, height } = newAnnotation.imageRect
    let normalizedRect: ImageRect

    // Handle negative width/height for drawing in any direction
    if (width >= 0 && height >= 0) {
      normalizedRect = { x, y, width, height }
    } else if (width < 0 && height >= 0) {
      normalizedRect = { x: x + width, y, width: Math.abs(width), height }
    } else if (width >= 0 && height < 0) {
      normalizedRect = { x, y: y + height, width, height: Math.abs(height) }
    } else {
      normalizedRect = {
        x: x + width,
        y: y + height,
        width: Math.abs(width),
        height: Math.abs(height),
      }
    }

    const viewportRect = getAnnotationViewportRect({
      id: 'temp',
      type: 'temp',
      imageRect: normalizedRect,
      content: '',
    } as Annotation)

    // Convert viewport coordinates to screen coordinates
    const {
      left,
      top,
      width: boxWidth,
      height: boxHeight,
    } = viewportRectToScreenRect(viewportRect)

    return (
      <div
        className='absolute border-2 border-red-500 bg-red-200 bg-opacity-30'
        style={{
          left: `${left}px`,
          top: `${top}px`,
          width: `${boxWidth}px`,
          height: `${boxHeight}px`,
        }}
      />
    )
  }, [
    isDrawing,
    newAnnotation,
    viewerReady,
    getAnnotationViewportRect,
    viewportRectToScreenRect,
    viewportBounds,
  ])

  return (
    <div className='relative h-full w-full overflow-hidden'>
      <Script
        src='https://cdn.jsdelivr.net/npm/openseadragon@4.1.0/build/openseadragon/openseadragon.min.js'
        onLoad={() => setOsdLoaded(true)}
        strategy='afterInteractive'
      />

      <div
        ref={containerRef}
        className={`relative h-full w-full overflow-hidden ${
          isCreatingAnnotation
            ? 'cursor-crosshair'
            : isMoveToolActive
            ? 'cursor-move'
            : isDeleteMode
            ? 'cursor-pointer'
            : 'cursor-default'
        }`}
      >
        {/* OpenSeadragon will be initialized here */}
      </div>

      {!osdLoaded && (
        <div className='absolute inset-0 flex items-center justify-center bg-white'>
          <div className='text-center'>
            <div className='mb-4 h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-primary mx-auto'></div>
            <p className='text-lg font-medium'>Loading viewer...</p>
          </div>
        </div>
      )}

      {isLoading && <LoadingState />}

      {loadError && (
        <ImageFallback onRetry={handleRetryLoad} error={loadError} />
      )}

      {/* Annotation layer - positioned absolutely over the viewer */}
      <div
        ref={annotationLayerRef}
        className='absolute inset-0 z-20'
        style={{
          pointerEvents: isCreatingAnnotation || isDeleteMode ? 'auto' : 'none',
          cursor: isCreatingAnnotation
            ? 'crosshair'
            : isDeleteMode
            ? 'pointer'
            : 'default',
        }}
        onMouseDown={isCreatingAnnotation ? handleMouseDown : undefined}
        onMouseMove={isCreatingAnnotation ? handleMouseMove : undefined}
        onMouseUp={isCreatingAnnotation ? handleMouseUp : undefined}
        onMouseLeave={isCreatingAnnotation ? handleMouseUp : undefined}
      >
        {renderAnnotationBoxes()}
        {renderDrawingAnnotation()}

        {selectedAnnotation && selectedAnnotationPosition && !isDeleteMode && (
          <AnnotationPopup
            annotation={selectedAnnotation}
            onClose={() => {
              setSelectedAnnotation(null)
              setSelectedAnnotationPosition(null)
            }}
            onUpdate={onAnnotationUpdated}
            style={{
              position: 'absolute',
              left: `${
                selectedAnnotationPosition.left +
                selectedAnnotationPosition.width +
                10
              }px`,
              top: `${selectedAnnotationPosition.top}px`,
              zIndex: 1000,
              maxWidth: '500px',
              maxHeight: '80vh',
              overflow: 'auto',
            }}
          />
        )}
      </div>
    </div>
  )
}
