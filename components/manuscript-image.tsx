'use client'

import * as React from 'react'
import ManuscriptAnnotorious from './ManuscriptAnnotorious'
import type { Allograph } from '@/types/allographs'

interface Annotation {
  id: string
  type: 'editorial'
  x: number
  y: number
  width: number
  height: number
  content: string
  components?: Record<string, Record<string, boolean>>
  selectedAllograph?: Allograph
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
  onZoomChange: (zoom: number) => void
  iiifImageUrl: string
  selectedAllograph?: Allograph
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
  // Convert annotations to the format expected by ManuscriptAnnotorious
  const initialAnnotations = React.useMemo(() => {
    return annotations.map((ann) => ({
      id: ann.id,
      type: 'Annotation' as const,
      body: [
        {
          value: ann.content,
          type: ann.type,
        },
      ],
      target: {
        selector: {
          type: 'FragmentSelector',
          conformsTo: 'http://www.w3.org/TR/media-frags/',
          value: `xywh=${ann.x},${ann.y},${ann.width},${ann.height}`,
        },
      },
    }))
  }, [annotations])

  const handleCreate = React.useCallback(
    (annotation: any) => {
      // Convert back to the expected format
      const target = annotation.target?.selector?.value || ''
      const match = target.match(/xywh=(\d+),(\d+),(\d+),(\d+)/)
      if (match) {
        const [, x, y, width, height] = match.map(Number)
        onAnnotationCreated({
          id: annotation.id,
          type: 'editorial',
          x,
          y,
          width,
          height,
          content: annotation.body?.[0]?.value || '',
          selectedAllograph,
        })
      }
    },
    [onAnnotationCreated, selectedAllograph]
  )

  const handleDelete = React.useCallback(
    (annotation: any) => {
      onAnnotationDeleted(annotation.id)
    },
    [onAnnotationDeleted]
  )

  return (
    <ManuscriptAnnotorious
      iiifImageUrl={iiifImageUrl}
      onCreate={isCreatingAnnotation ? handleCreate : undefined}
      onDelete={isDeleteMode ? handleDelete : undefined}
      onSelect={undefined}
      initialAnnotations={annotationsEnabled ? initialAnnotations : []}
    />
  )
}
