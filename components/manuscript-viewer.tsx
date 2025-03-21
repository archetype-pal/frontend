'use client'

import { useState, useCallback, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  Pencil,
  Hand,
  Trash2,
  Save,
  ZoomIn,
  ZoomOut,
  RefreshCw,
  Expand,
  SquarePen,
} from 'lucide-react'
import { Toolbar } from './toolbar'
import { AnnotationHeader } from './annotation-header'
import { ManuscriptTabs } from './manuscript-tabs'
import { toast } from 'sonner'
import type { Allograph } from '@/types/allographs'
import type { HandType } from '@/types/hands'
import { ManuscriptImage } from './manuscript-image'
import type { ManuscriptImage as ManuscriptImageType } from '@/types/manuscript-image'

// Define tool types for better type safety
type ToolType = 'move' | 'editorial' | 'delete' | 'modify' | 'draw'

interface Annotation {
  id: string
  type: string
  imageRect: {
    x: number
    y: number
    width: number
    height: number
  }
  content: string
  selectedAllograph?: Allograph
  components?: Record<string, Record<string, boolean>>
}

interface ManuscriptViewerProps {
  imageId: string
  initialData: ManuscriptImageType
}

export default function ManuscriptViewer({
  imageId,
  initialData,
}: ManuscriptViewerProps) {
  // State
  const [annotations, setAnnotations] = useState<Annotation[]>([])
  const [activeTool, setActiveTool] = useState<ToolType>('move')
  const [unsavedChanges, setUnsavedChanges] = useState(0)
  const [selectedAllograph, setSelectedAllograph] = useState<
    Allograph | undefined
  >(undefined)
  const [, setSelectedHand] = useState<HandType | undefined>(undefined)
  const [annotationsEnabled, setAnnotationsEnabled] = useState(true)
  const [, setSelectedAnnotation] = useState<Annotation | null>(null)
  const [zoom, setZoom] = useState(1)
  const [imageUrl, setImageUrl] = useState<string>('')

  // Set the image URL from the initialData
  useEffect(() => {
    if (initialData && initialData.iiif_image) {
      console.log('Setting image URL from initialData:', initialData.iiif_image)
      setImageUrl(initialData.iiif_image)
    }
  }, [initialData])

  // Set the active tool
  const setTool = useCallback((tool: ToolType) => {
    setActiveTool(tool)
    console.log(`Tool changed to: ${tool}`)
  }, [])

  // Handle annotation creation
  const handleAnnotationCreated = useCallback((annotation: Annotation) => {
    setAnnotations((prev) => [...prev, annotation])
    setUnsavedChanges((prev) => prev + 1)
    setSelectedAnnotation(annotation)
  }, [])

  // Handle annotation update
  const handleAnnotationUpdated = useCallback(
    (updatedAnnotation: Annotation) => {
      setAnnotations((prev) =>
        prev.map((a) => (a.id === updatedAnnotation.id ? updatedAnnotation : a))
      )
      setUnsavedChanges((prev) => prev + 1)
      setSelectedAnnotation(updatedAnnotation)
    },
    []
  )

  // Handle annotation deletion
  const handleAnnotationDeleted = useCallback((annotationId: string) => {
    setAnnotations((prev) => prev.filter((a) => a.id !== annotationId))
    setUnsavedChanges((prev) => prev + 1)
    setSelectedAnnotation(null)
  }, [])

  // Handle save
  const handleSave = async () => {
    try {
      // In a real implementation, you would send these to your backend
      console.log('Saving annotations:', annotations)

      // Mock API call - replace with your actual API endpoint
      await new Promise((resolve) => setTimeout(resolve, 500))

      setUnsavedChanges(0)
      toast.success('All annotations saved successfully')
    } catch (error) {
      console.error('Error saving annotations:', error)
      toast.error('Failed to save annotations')
    }
  }

  // Handle zoom change
  const handleZoomChange = useCallback((newZoom: number) => {
    setZoom(newZoom)
  }, [])

  return (
    <div className='flex h-screen flex-col'>
      <header className='border-b bg-card px-4 py-2'>
        <h1 className='text-lg font-semibold'>Manuscript Image: {imageId}</h1>
        <p className='text-sm text-muted-foreground'>
          {initialData?.texts?.[0]?.content || 'Manuscript Viewer'}
        </p>
      </header>

      <ManuscriptTabs />

      <AnnotationHeader
        annotationsEnabled={annotationsEnabled}
        onToggleAnnotations={setAnnotationsEnabled}
        unsavedCount={unsavedChanges}
        imageId={imageId}
        onAllographSelect={setSelectedAllograph}
        onHandSelect={setSelectedHand}
      />

      <div className='relative flex flex-1'>
        <Toolbar>
          <Button
            variant={activeTool === 'move' ? 'default' : 'ghost'}
            size='icon'
            onClick={() => setTool('move')}
            title='Move Tool (m)'
          >
            <Hand className='h-4 w-4' />
          </Button>

          <Button
            variant='ghost'
            size='icon'
            onClick={() => handleZoomChange(Math.min(zoom * 1.2, 4))}
            title='Zoom In'
          >
            <ZoomIn className='h-4 w-4' />
          </Button>

          <Button
            variant='ghost'
            size='icon'
            onClick={() => handleZoomChange(Math.max(zoom / 1.2, 0.5))}
            title='Zoom Out'
          >
            <ZoomOut className='h-4 w-4' />
          </Button>

          <Button
            variant='ghost'
            size='icon'
            onClick={() => handleZoomChange(1)}
            title='Reset Zoom'
          >
            <RefreshCw className='h-4 w-4' />
          </Button>

          <Button
            variant={activeTool === 'editorial' ? 'default' : 'ghost'}
            size='icon'
            onClick={() => setTool('editorial')}
            title='Create Editorial Annotation'
          >
            <Pencil className='h-4 w-4' />
          </Button>

          <Button
            variant='ghost'
            size='icon'
            onClick={handleSave}
            disabled={unsavedChanges === 0}
            title='Save (s)'
          >
            <Save className='h-4 w-4' />
          </Button>

          <Button
            variant={activeTool === 'delete' ? 'default' : 'ghost'}
            size='icon'
            onClick={() => setTool('delete')}
            title='Delete (del)'
          >
            <Trash2 className='h-4 w-4' />
          </Button>

          <Button
            variant={activeTool === 'modify' ? 'default' : 'ghost'}
            size='icon'
            onClick={() => setTool('modify')}
            title='Modify (m)'
          >
            <Expand className='h-4 w-4' />
          </Button>

          <Button
            variant={activeTool === 'draw' ? 'default' : 'ghost'}
            size='icon'
            onClick={() => setTool('draw')}
            title='Draw Annotation (d)'
          >
            <SquarePen className='h-4 w-4' />
          </Button>
        </Toolbar>

        <div className='flex-1 overflow-hidden p-4'>
          <div className='relative h-[calc(100%-3rem)] w-full overflow-hidden rounded-lg border bg-accent/50 ml-10'>
            {imageUrl ? (
              <ManuscriptImage
                annotationsEnabled={annotationsEnabled}
                annotations={annotations}
                isCreatingAnnotation={activeTool === 'editorial'}
                isMoveToolActive={activeTool === 'move'}
                isDeleteMode={activeTool === 'delete'}
                onAnnotationCreated={handleAnnotationCreated}
                onAnnotationUpdated={handleAnnotationUpdated}
                onAnnotationDeleted={handleAnnotationDeleted}
                zoom={zoom}
                onZoomChange={handleZoomChange}
                iiifImageUrl={imageUrl}
                selectedAllograph={selectedAllograph}
              />
            ) : (
              <div className='flex h-full w-full items-center justify-center'>
                <div className='text-center'>
                  <div className='mb-4 h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-primary mx-auto'></div>
                  <p className='text-lg font-medium'>Loading image data...</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
