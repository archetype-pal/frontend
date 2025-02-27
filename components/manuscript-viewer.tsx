'use client'

import * as React from 'react'
import {
  LaptopMinimal,
  RefreshCw,
  ZoomIn,
  ZoomOut,
  Hand,
  Pencil,
  Save,
  Trash2,
  Expand,
  SquarePen,
} from 'lucide-react'
import { ManuscriptImage } from '@/components/manuscript-image'
import { ManuscriptTabs } from './manuscript-tabs'
import { Toolbar } from './toolbar'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { AnnotationHeader } from './annotation-header'
import { saveAnnotation } from '@/services/annotations'
import { fetchManuscriptImage } from '@/services/manuscripts'
// import { toast } from 'sonner'
import type { ManuscriptImage as ManuscriptImageType } from '@/types/manuscript-image'
import type { HandType } from '@/types/hands'

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

interface ManuscriptViewerProps {
  imageId: string
}

interface Allograph {
  id: string
  name: string
}

export default function ManuscriptViewer({ imageId }: ManuscriptViewerProps) {
  const [zoom, setZoom] = React.useState(1)
  const [annotationsEnabled, setAnnotationsEnabled] = React.useState(true)
  const [annotations, setAnnotations] = React.useState<Annotation[]>([])
  const [isCreatingAnnotation, setIsCreatingAnnotation] = React.useState(false)
  const [isMoveToolActive, setIsMoveToolActive] = React.useState(true) // Set to true by default
  const [isDeleteMode, setIsDeleteMode] = React.useState(false)
  const [activeButton, setActiveButton] = React.useState<string>('move') // Set "move" as the default active button
  const [unsavedChanges, setUnsavedChanges] = React.useState(0)
  const [manuscriptImage, setManuscriptImage] =
    React.useState<ManuscriptImageType | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [selectedAllograph, setSelectedAllograph] = React.useState<
    Allograph | undefined
  >(undefined)

  const [selectedHand, setSelectedHand] = React.useState<HandType | undefined>(
    undefined
  )

  React.useEffect(() => {
    const loadManuscriptImage = async () => {
      try {
        setLoading(true)
        const image = await fetchManuscriptImage(imageId)
        setManuscriptImage(image)
        setError(null)
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to load manuscript image'
        )
        // toast.error('Failed to load manuscript image')
      } finally {
        setLoading(false)
      }
    }

    loadManuscriptImage()
  }, [imageId])

  const handleZoomChange = (newZoom: number) => {
    setZoom(newZoom)
  }

  const handleCreateAnnotation = () => {
    setIsCreatingAnnotation((prev) => !prev)
    setIsMoveToolActive(false)
    setIsDeleteMode(false)
    setActiveButton((prev) => (prev === 'editorial' ? 'move' : 'editorial'))
  }

  const handleMoveTool = () => {
    setIsMoveToolActive((prev) => !prev)
    setIsCreatingAnnotation(false)
    setIsDeleteMode(false)
    setActiveButton((prev) => (prev === 'move' ? null : 'move'))
  }

  const handleDeleteTool = () => {
    setIsDeleteMode((prev) => !prev)
    setIsCreatingAnnotation(false)
    setIsMoveToolActive(false)
    setActiveButton((prev) => (prev === 'delete' ? 'move' : 'delete'))
  }

  const handleAnnotationCreated = (annotation: Annotation) => {
    setAnnotations((prevAnnotations) => [...prevAnnotations, annotation])
    setUnsavedChanges((prev) => prev + 1)
  }

  const handleAnnotationUpdated = (updatedAnnotation: Annotation) => {
    setAnnotations((prevAnnotations) =>
      prevAnnotations.map((a) =>
        a.id === updatedAnnotation.id ? updatedAnnotation : a
      )
    )
    setUnsavedChanges((prev) => prev + 1)
  }

  const handleAnnotationDeleted = (annotationId: string) => {
    setAnnotations((prevAnnotations) =>
      prevAnnotations.filter((a) => a.id !== annotationId)
    )
    setUnsavedChanges((prev) => prev + 1)
  }

  const handleZoomIn = () => {
    setZoom((prevZoom) => Math.min(prevZoom * 1.2, 4))
  }

  const handleZoomOut = () => {
    setZoom((prevZoom) => Math.max(prevZoom / 1.2, 0.5))
  }

  const handleSave = React.useCallback(async () => {
    try {
      console.log('Saving with selected hand:', selectedHand)
      const promises = annotations.map((annotation) => {
        console.log('🚀 ~ promises ~ annotation:', annotation)

        const graphcomponent_set =
          annotation.selectedAllograph?.components
            .map((component) => ({
              component: component.component_id,
              features: component.features
                .filter(
                  (feature) =>
                    annotation.components?.[component.component_name]?.[
                      feature.name
                    ]
                )
                .map((feature) => feature.id),
            }))
            .filter((comp) => comp.features.length > 0) || []

        console.log('selectedAllograph', selectedAllograph)

        const requestData = {
          item_image: Number.parseInt(imageId) || 0,
          annotation: {
            content: annotation.content,
            type: annotation.type,
            position: {
              x: annotation.x,
              y: annotation.y,
              width: annotation.width,
              height: annotation.height,
            },
          },
          allograph: selectedAllograph?.id,
          hand: selectedHand?.id,
          graphcomponent_set: graphcomponent_set,
          positions: [
            annotation.x,
            annotation.y,
            annotation.width,
            annotation.height,
          ],
        }

        return saveAnnotation(requestData)
      })

      await Promise.all(promises)
      setUnsavedChanges(0)
      // toast.success('All annotations saved successfully')
    } catch (error) {
      console.error('Error saving annotations:', error)
      // toast.error('Failed to save annotations')
    }
  }, [annotations, manuscriptImage])

  React.useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        if (unsavedChanges > 0) {
          handleSave()
        }
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [unsavedChanges, handleSave])

  if (loading) {
    return (
      <div className='flex h-screen items-center justify-center'>
        Loading...
      </div>
    )
  }

  if (error || !manuscriptImage) {
    return (
      <div className='flex h-screen items-center justify-center'>
        <div className='text-center'>
          <p className='text-red-500 mb-4'>
            {error || 'Failed to load manuscript image'}
          </p>
          <Button onClick={() => window.location.reload()}>Try Again</Button>
        </div>
      </div>
    )
  }

  return (
    <div className='flex h-screen flex-col'>
      <header className='border-b bg-card px-4 py-2'>
        <h1 className='text-lg font-semibold'>
          Manuscript Image: {manuscriptImage.id}
        </h1>
        <p className='text-sm text-muted-foreground'>
          {manuscriptImage.texts[0]?.content || 'No description available'}
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
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant='ghost' size='icon'>
                  <LaptopMinimal className='h-4 w-4' />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Full Screen</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={activeButton === 'move' ? 'default' : 'ghost'}
                  size='icon'
                  onClick={handleMoveTool}
                >
                  <Hand className='h-4 w-4' />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Move Tool (m)</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant='ghost' size='icon' onClick={handleZoomIn}>
                  <ZoomIn className='h-4 w-4' />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Zoom In</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant='ghost' size='icon' onClick={handleZoomOut}>
                  <ZoomOut className='h-4 w-4' />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Zoom Out</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant='ghost' size='icon'>
                  <RefreshCw className='h-4 w-4' />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Reset Zoom</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={activeButton === 'editorial' ? 'default' : 'ghost'}
                  size='icon'
                  onClick={handleCreateAnnotation}
                >
                  <Pencil className='h-4 w-4' />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Create Editorial Annotation</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant='ghost'
                  size='icon'
                  onClick={handleSave}
                  disabled={unsavedChanges === 0}
                >
                  <Save className='h-4 w-4' />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Save (s)</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={activeButton === 'delete' ? 'default' : 'ghost'}
                  size='icon'
                  onClick={handleDeleteTool}
                >
                  <Trash2 className='h-4 w-4' />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Delete (del)</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant='ghost' size='icon'>
                  <Expand className='h-4 w-4' />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Modify (m)</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant='ghost' size='icon'>
                  <SquarePen className='h-4 w-4' />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Draw Annotation (d)</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </Toolbar>

        <div className='flex-1 overflow-hidden p-4'>
          <div className='relative h-[calc(100%-3rem)] w-full overflow-hidden rounded-lg border bg-accent/50 ml-10'>
            <ManuscriptImage
              annotationsEnabled={annotationsEnabled}
              annotations={annotations}
              isCreatingAnnotation={isCreatingAnnotation}
              isMoveToolActive={isMoveToolActive}
              isDeleteMode={isDeleteMode}
              onAnnotationCreated={handleAnnotationCreated}
              onAnnotationUpdated={handleAnnotationUpdated}
              onAnnotationDeleted={handleAnnotationDeleted}
              zoom={zoom}
              onZoomChange={handleZoomChange}
              iiifImageUrl={manuscriptImage.iiif_image}
              selectedAllograph={selectedAllograph}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
