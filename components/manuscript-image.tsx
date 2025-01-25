'use client'

import type React from 'react'
import { useState, useRef, useCallback } from 'react'
import { AnnotationPopup } from './annotation-popup'

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
  onAnnotationCreated: (annotation: Annotation) => void
  onAnnotationUpdated: (annotation: Annotation) => void
}

export function ManuscriptImage({
  annotationsEnabled,
  annotations,
  isCreatingAnnotation,
  onAnnotationCreated,
  onAnnotationUpdated,
}: ManuscriptImageProps) {
  const [newAnnotation, setNewAnnotation] =
    useState<Partial<Annotation> | null>(null)
  const [selectedAnnotation, setSelectedAnnotation] =
    useState<Annotation | null>(null)
  const imageRef = useRef<HTMLImageElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!isCreatingAnnotation || !imageRef.current) return

      const rect = imageRef.current.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top

      setNewAnnotation({
        x,
        y,
        width: 0,
        height: 0,
      })
    },
    [isCreatingAnnotation]
  )

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!newAnnotation || !imageRef.current) return

      const rect = imageRef.current.getBoundingClientRect()
      const width = e.clientX - rect.left - newAnnotation.x!
      const height = e.clientY - rect.top - newAnnotation.y!

      setNewAnnotation((prev) => ({
        ...prev,
        width,
        height,
      }))
    },
    [newAnnotation]
  )

  const handleMouseUp = useCallback(() => {
    if (!newAnnotation) return

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
    setSelectedAnnotation(annotation)
  }, [newAnnotation, onAnnotationCreated])

  const handleAnnotationClick = (
    annotation: Annotation,
    e: React.MouseEvent
  ) => {
    e.stopPropagation()
    setSelectedAnnotation(annotation)
  }

  return (
    <div
      ref={containerRef}
      className={`relative h-full w-full overflow-auto ${
        isCreatingAnnotation ? 'cursor-crosshair' : 'cursor-default'
      }`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onClick={() => setSelectedAnnotation(null)}
    >
      <img
        ref={imageRef}
        src='https://iiif.wellcomecollection.org/image/b20432033_B0008608.JP2/full/full/0/default.jpg'
        alt='Manuscript'
        className='w-full h-auto'
      />
      {annotationsEnabled && (
        <>
          {annotations.map((annotation) => (
            <div
              key={annotation.id}
              className='absolute border-2 border-blue-500 bg-blue-200 bg-opacity-30 cursor-pointer hover:border-blue-600 hover:bg-blue-300 hover:bg-opacity-40 transition-colors'
              style={{
                left: `${annotation.x}px`,
                top: `${annotation.y}px`,
                width: `${annotation.width}px`,
                height: `${annotation.height}px`,
              }}
              onClick={(e) => handleAnnotationClick(annotation, e)}
            />
          ))}
          {newAnnotation && (
            <div
              className='absolute border-2 border-red-500 bg-red-200 bg-opacity-30'
              style={{
                left: `${newAnnotation.x}px`,
                top: `${newAnnotation.y}px`,
                width: `${Math.abs(newAnnotation.width!)}px`,
                height: `${Math.abs(newAnnotation.height!)}px`,
              }}
            />
          )}
          {selectedAnnotation && (
            <AnnotationPopup
              annotation={selectedAnnotation}
              onClose={() => setSelectedAnnotation(null)}
              onUpdate={(updated) => {
                onAnnotationUpdated(updated)
                setSelectedAnnotation(updated)
              }}
              style={{
                left: `${
                  selectedAnnotation.x + Math.abs(selectedAnnotation.width) + 10
                }px`,
                top: `${selectedAnnotation.y}px`,
              }}
            />
          )}
        </>
      )}
    </div>
  )
}
