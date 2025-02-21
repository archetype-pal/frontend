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

export default function ManuscriptViewer() {
  const [, setZoom] = React.useState(100)
  // setZoom(100)
  const [annotationsEnabled, setAnnotationsEnabled] = React.useState(true)
  const [annotations, setAnnotations] = React.useState<Annotation[]>([])
  const [isCreatingAnnotation, setIsCreatingAnnotation] = React.useState(false)
  const [activeButton, setActiveButton] = React.useState<string | null>(null)
  const [unsavedChanges, setUnsavedChanges] = React.useState(0)

  const handleCreateAnnotation = () => {
    setIsCreatingAnnotation((prev) => !prev)
    setActiveButton((prev) => (prev === 'editorial' ? null : 'editorial'))
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

  return (
    <div className='flex h-screen flex-col'>
      <header className='border-b bg-card px-4 py-2'>
        <h1 className='text-lg font-semibold'>
          Manuscript Image: DCA DCD 1.1.Sacr.12: dorse
        </h1>
        <p className='text-sm text-muted-foreground'>
          Probably early 13th century: Walter del Bois for the welfare of
          himself, Galiena, his spouse, and Richard his heir ...
        </p>
      </header>

      <ManuscriptTabs />

      <AnnotationHeader
        annotationsEnabled={annotationsEnabled}
        onToggleAnnotations={setAnnotationsEnabled}
        unsavedCount={unsavedChanges}
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
                <Button variant='ghost' size='icon'>
                  <Hand className='h-4 w-4' />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Select (g)</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant='ghost' size='icon'>
                  <ZoomIn className='h-4 w-4' />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Refresh</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant='ghost' size='icon'>
                  <RefreshCw className='h-4 w-4' />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Zoom (z)</TooltipContent>
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
                <Button variant='ghost' size='icon'>
                  <Save className='h-4 w-4' />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Save (s)</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant='ghost' size='icon'>
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
                onAnnotationCreated={handleAnnotationCreated}
                onAnnotationUpdated={handleAnnotationUpdated}
              />
            <div className='absolute left-4 top-4 flex flex-col gap-2'>
              <Button
                variant='secondary'
                size='icon'
                onClick={() => setZoom((z) => Math.min(z + 10, 200))}
              >
                <ZoomIn className='h-4 w-4' />
              </Button>
              <Button
                variant='secondary'
                size='icon'
                onClick={() => setZoom((z) => Math.max(z - 10, 50))}
              >
                <ZoomOut className='h-4 w-4' />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
