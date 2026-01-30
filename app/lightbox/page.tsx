'use client'

import * as React from 'react'
import { Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useCollection, type CollectionItem } from '@/contexts/collection-context'
import { useLightboxStore } from '@/stores/lightbox-store'
import type { ImageListItem } from '@/types/image'
import type { GraphListItem } from '@/types/graph'
import { LightboxViewer } from '@/components/lightbox/lightbox-viewer'
import { LightboxToolbar } from '@/components/lightbox/lightbox-toolbar'
import { LightboxSidebar } from '@/components/lightbox/lightbox-sidebar'
import { LightboxErrorBoundary } from '@/components/lightbox/lightbox-error-boundary'
import { LightboxKeyboardShortcuts } from '@/components/lightbox/lightbox-keyboard-shortcuts'
import { LightboxCropTool } from '@/components/lightbox/lightbox-crop-tool'
import { LightboxExport } from '@/components/lightbox/lightbox-export'
import { LightboxSessionManager } from '@/components/lightbox/lightbox-session-manager'
import { LightboxMeasurementTool } from '@/components/lightbox/lightbox-measurement-tool'
import { LightboxComparisonMode } from '@/components/lightbox/lightbox-comparison-mode'
import { LightboxRegionComparison } from '@/components/lightbox/lightbox-region-comparison'
import { LightboxImport } from '@/components/lightbox/lightbox-import'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { saveRegion, type LightboxRegion } from '@/lib/lightbox-db'

function LightboxPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { items: collectionItems } = useCollection()
  const {
    currentWorkspaceId,
    createWorkspace,
    loadImages,
    setLoading,
    setError,
    error,
    isLoading,
  } = useLightboxStore()

  const [isInitialized, setIsInitialized] = React.useState(false)
  const [cropImageId, setCropImageId] = React.useState<string | null>(null)
  const [showExport, setShowExport] = React.useState(false)
  const [showSessionManager, setShowSessionManager] = React.useState(false)
  const [showMinimap, setShowMinimap] = React.useState(false)
  const [showMeasurement, setShowMeasurement] = React.useState(false)
  const [showComparison, setShowComparison] = React.useState(false)
  const [showRegionComparison, setShowRegionComparison] = React.useState(false)
  const [showImport, setShowImport] = React.useState(false)
  const viewerContainerRef = React.useRef<HTMLDivElement>(null)
  const { initialize, images } = useLightboxStore()

  // Initialize store from IndexedDB first
  React.useEffect(() => {
    async function initStore() {
      await initialize()
      setIsInitialized(true)
    }
    initStore()
  }, [initialize])

  // Initialize workspace and load images from URL params.
  // Re-runs when URL changes (searchParams) or when from=collection and collection loads.
  const paramKey = searchParams.toString()
  const fromCollectionCount = searchParams.get('from') === 'collection' ? collectionItems.length : -1

  React.useEffect(() => {
    if (!isInitialized) return

    async function loadImagesFromParams() {
      try {
        setError(null)
        setLoading(true)

        // Check URL parameters
        const imageId = searchParams.get('image')
        const graphId = searchParams.get('graph')
        const imagesParam = searchParams.get('images')
        const graphsParam = searchParams.get('graphs')
        const fromCollection = searchParams.get('from') === 'collection'

        // Create workspace if needed
        if (!currentWorkspaceId) {
          await createWorkspace()
        }

        const itemsToLoad: (CollectionItem | ImageListItem | GraphListItem)[] = []

        // Load images based on parameters
        if (imageId) {
          // Try to find in collection first
          let item = collectionItems.find((i) => i.id === Number(imageId) && i.type === 'image')
          
          // If not in collection, try to fetch from API
          if (!item) {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
            const url = `${apiUrl}/api/v1/search/images/${imageId}`
            try {
              const response = await fetch(url)
              if (response.ok) {
                const data = await response.json()
                item = { ...data, type: 'image' as const } as CollectionItem
              } else {
                setError(`Image ${imageId} not found (${response.status}: ${response.statusText}). URL: ${url}`)
              }
            } catch (err) {
              const msg = err instanceof Error ? err.message : String(err)
              setError(`Failed to load image ${imageId}: ${msg}`)
            }
          }
          
          if (item) {
            itemsToLoad.push(item)
          }
        } else if (graphId) {
          // Try to find in collection first
          let item = collectionItems.find((i) => i.id === Number(graphId) && i.type === 'graph')
          
          // If not in collection, try to fetch from API
          if (!item) {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
            const url = `${apiUrl}/api/v1/search/graphs/${graphId}`
            try {
              const response = await fetch(url)
              if (response.ok) {
                const data = await response.json()
                item = { ...data, type: 'graph' as const } as CollectionItem
              } else {
                setError(`Graph ${graphId} not found (${response.status}: ${response.statusText}). URL: ${url}`)
              }
            } catch (err) {
              const msg = err instanceof Error ? err.message : String(err)
              setError(`Failed to load graph ${graphId}: ${msg}`)
            }
          }
          
          if (item) {
            itemsToLoad.push(item)
          }
        } else if (imagesParam) {
          // Load multiple images
          const ids = imagesParam.split(',').map(Number)
          const collectionItemsFound = collectionItems.filter(
            (i) => ids.includes(i.id) && i.type === 'image'
          )
          
          // Fetch missing items from API
          const missingIds = ids.filter(id => !collectionItemsFound.some(i => i.id === id))
          const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
          const failed: string[] = []
          for (const id of missingIds) {
            try {
              const response = await fetch(`${apiUrl}/api/v1/search/images/${id}`)
              if (response.ok) {
                const data = await response.json()
                itemsToLoad.push(data as ImageListItem)
              } else {
                failed.push(`image ${id} (${response.status})`)
              }
            } catch (err) {
              failed.push(`image ${id}: ${err instanceof Error ? err.message : String(err)}`)
            }
          }
          if (failed.length > 0 && collectionItemsFound.length === 0 && itemsToLoad.length === 0) {
            setError(`Could not load images: ${failed.join('; ')}`)
          }
          itemsToLoad.push(...collectionItemsFound)
        } else if (graphsParam) {
          // Load multiple graphs
          const ids = graphsParam.split(',').map(Number)
          const collectionItemsFound = collectionItems.filter(
            (i) => ids.includes(i.id) && i.type === 'graph'
          )
          
          // Fetch missing items from API
          const missingIds = ids.filter(id => !collectionItemsFound.some(i => i.id === id))
          const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
          const failed: string[] = []
          for (const id of missingIds) {
            try {
              const response = await fetch(`${apiUrl}/api/v1/search/graphs/${id}`)
              if (response.ok) {
                const data = await response.json()
                itemsToLoad.push(data as GraphListItem)
              } else {
                failed.push(`graph ${id} (${response.status})`)
              }
            } catch (err) {
              failed.push(`graph ${id}: ${err instanceof Error ? err.message : String(err)}`)
            }
          }
          if (failed.length > 0 && collectionItemsFound.length === 0 && itemsToLoad.length === 0) {
            setError(`Could not load graphs: ${failed.join('; ')}`)
          }
          itemsToLoad.push(...collectionItemsFound)
        } else if (fromCollection) {
          // Load all from collection
          itemsToLoad.push(...collectionItems)
        }

        if (itemsToLoad.length > 0) {
          await loadImages(itemsToLoad)
        }
      } catch (error) {
        console.error('Failed to load images:', error)
        setError(error instanceof Error ? error.message : 'Failed to load images')
      } finally {
        setLoading(false)
      }
    }

    loadImagesFromParams()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInitialized, paramKey, fromCollectionCount])

  const handleBack = () => {
    router.back()
  }

  const handleCrop = (imageId: string) => {
    setCropImageId(imageId)
  }

  const handleCropSave = async (cropArea: { x: number; y: number; width: number; height: number }) => {
    if (!cropImageId || !currentWorkspaceId) return

    const image = images.get(cropImageId)
    if (!image) {
      setError('Image not found; cannot save crop.')
      return
    }

    const regionId = `region-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
    const region: LightboxRegion = {
      id: regionId,
      imageId: cropImageId,
      workspaceId: currentWorkspaceId,
      title: `Crop from ${image.metadata.shelfmark || 'image'}`,
      coordinates: cropArea,
      imageData: image.imageUrl,
      metadata: { manuscript: image.metadata.shelfmark },
      createdAt: Date.now(),
    }
    try {
      await saveRegion(region)
      setCropImageId(null)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setError(`Failed to save crop: ${msg}`)
      if (process.env.NODE_ENV === 'development') {
        console.error('[Lightbox] saveRegion failed:', err)
      }
      throw err
    }
  }

  const handleSaveSession = () => {
    setShowSessionManager(true)
  }

  if (!isInitialized || isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading lightbox...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center max-w-md p-6">
          <p className="text-red-500 mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>Reload</Button>
        </div>
      </div>
    )
  }

  return (
    <LightboxErrorBoundary>
      <LightboxKeyboardShortcuts />
      <div className="h-screen flex flex-col bg-gray-50">
        {/* Header */}
        <header className="shrink-0 border-b bg-white px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={handleBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <h1 className="text-lg font-semibold">Digital Lightbox</h1>
          </div>
          <LightboxToolbar
            onCrop={handleCrop}
            onExport={() => setShowExport(true)}
            onSaveSession={handleSaveSession}
            onImport={() => setShowImport(true)}
            onToggleMinimap={() => setShowMinimap(!showMinimap)}
            onToggleMeasurement={() => setShowMeasurement(!showMeasurement)}
            onToggleComparison={() => setShowComparison(!showComparison)}
            onToggleRegionComparison={() => setShowRegionComparison(!showRegionComparison)}
            onToggleAnnotations={() => {
              const { showAnnotations, setShowAnnotations } = useLightboxStore.getState()
              setShowAnnotations(!showAnnotations)
            }}
            onToggleGrid={() => {
              const { showGrid, setShowGrid } = useLightboxStore.getState()
              setShowGrid(!showGrid)
            }}
          />
        </header>

        {/* Main Content */}
        <div className="flex-1 flex min-h-0">
          {/* Sidebar */}
          <LightboxSidebar />

          {/* Viewer */}
          <div ref={viewerContainerRef} className="flex-1 min-w-0">
            <LightboxViewer showMinimap={showMinimap} />
          </div>
        </div>
      </div>

      {/* Crop Tool Modal */}
      {cropImageId && images.get(cropImageId) && (
        <LightboxCropTool
          image={images.get(cropImageId)!}
          onCrop={handleCropSave}
          onCancel={() => setCropImageId(null)}
        />
      )}

      {/* Export Dialog */}
      {showExport && (
        <LightboxExport onClose={() => setShowExport(false)} />
      )}

      {/* Session Manager */}
      {showSessionManager && (
        <LightboxSessionManager
          onClose={() => setShowSessionManager(false)}
          onLoad={() => {
            setShowSessionManager(false)
          }}
        />
      )}

      {/* Measurement Tool */}
      {showMeasurement && (
        <LightboxMeasurementTool
          containerRef={viewerContainerRef}
          onClose={() => setShowMeasurement(false)}
        />
      )}

      {/* Comparison Mode */}
      {showComparison && (
        <LightboxComparisonMode
          onClose={() => setShowComparison(false)}
        />
      )}

      {/* Region Comparison */}
      {showRegionComparison && (
        <LightboxRegionComparison
          onClose={() => setShowRegionComparison(false)}
        />
      )}

      {/* Import Dialog */}
      {showImport && (
        <LightboxImport onClose={() => setShowImport(false)} />
      )}
    </LightboxErrorBoundary>
  )
}

export default function LightboxPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center">Loading...</div>}>
      <LightboxPageContent />
    </Suspense>
  )
}
