'use client'

import * as React from 'react'
import { Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useCollection, type CollectionItem } from '@/contexts/collection-context'
import { useLightboxStore } from '@/stores/lightbox-store'
import { resolveItemById, resolveItemsByIds } from '@/lib/lightbox-params'
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

  React.useEffect(() => {
    let cancelled = false
    async function initStore() {
      await initialize()
      if (!cancelled) setIsInitialized(true)
    }
    initStore()
    return () => { cancelled = true }
  }, [initialize])

  const paramKey = searchParams.toString()
  const fromCollectionCount = searchParams.get('from') === 'collection' ? collectionItems.length : -1

  React.useEffect(() => {
    if (!isInitialized) return

    const imageId = searchParams.get('image')
    const graphId = searchParams.get('graph')
    const imagesParam = searchParams.get('images')
    const graphsParam = searchParams.get('graphs')
    const fromCollection = searchParams.get('from') === 'collection'

    let cancelled = false
    async function loadImagesFromParams() {
      try {
        setError(null)
        setLoading(true)
        if (!currentWorkspaceId) await createWorkspace()
        if (cancelled) return

        type ResolvedItem = CollectionItem | import('@/types/image').ImageListItem | import('@/types/graph').GraphListItem
        const itemsToLoad: ResolvedItem[] = []

        if (imageId) {
          const item = await resolveItemById('image', imageId, collectionItems, setError)
          if (item) itemsToLoad.push(item)
        } else if (graphId) {
          const item = await resolveItemById('graph', graphId, collectionItems, setError)
          if (item) itemsToLoad.push(item)
        } else if (imagesParam) {
          const ids = imagesParam.split(',').map(Number)
          await resolveItemsByIds('image', ids, collectionItems, itemsToLoad, setError)
        } else if (graphsParam) {
          const ids = graphsParam.split(',').map(Number)
          await resolveItemsByIds('graph', ids, collectionItems, itemsToLoad, setError)
        } else if (fromCollection) {
          itemsToLoad.push(...collectionItems)
        }

        if (!cancelled && itemsToLoad.length > 0) await loadImages(itemsToLoad)
      } catch (error) {
        if (!cancelled) setError(error instanceof Error ? error.message : 'Failed to load images')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadImagesFromParams()
    return () => { cancelled = true }
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
