'use client'

import * as React from 'react'
import {
    Home, LaptopMinimal, ZoomIn, ZoomOut, Hand, Pencil, Save, Trash2, Expand, SquarePen, Maximize2,
} from 'lucide-react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import type { ViewerApi, Annotation as A9sAnnotation, } from '@/components/ManuscriptAnnotorious'

const ManuscriptAnnotorious = dynamic(() => import('@/components/ManuscriptAnnotorious'), { ssr: false })

import { ManuscriptTabs } from './manuscript-tabs'
import { Toolbar } from './toolbar'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { AnnotationHeader } from './annotation-header'
import { OpenLightboxButton } from '@/components/lightbox/open-lightbox-button'
import { fetchManuscriptImage, fetchAllographs, fetchManuscript } from '@/services/manuscripts'
import { fetchAnnotationsForImage, postAnnotation, patchAnnotation, type BackendGraph } from '@/services/annotations'
import { backendToA9sAnnotation, a9sToBackendFeature, isDbAnnotation, dbIdFromA9s } from '@/lib/annoMapping'

import type { ManuscriptImage as ManuscriptImageType } from '@/types/manuscript-image'
import type { Allograph } from '@/types/allographs'
import type { HandType } from '@/types/hands'
import type { Manuscript } from '@/types/manuscript'

interface ManuscriptViewerProps { imageId: string }

// small helpers for cache meta
const metaKeyFor = (iiif: string) => `annotations:meta:${iiif}`
const cacheKeyFor = (iiif: string) => `annotations:${iiif}`
const isDbId = (id?: string) => typeof id === 'string' && id.startsWith('db:')

/** Rewrite cross-origin IIIF URL to same-origin /iiif-proxy to avoid CORS. */
function browserSafeIiifUrl(raw: string): string {
    const base = raw.replace(/\/info\.json$/, '')
    if (typeof window === 'undefined') return base
    try {
        const u = new URL(raw)
        if (u.origin !== window.location.origin) {
            const path = u.pathname.replace(/\/info\.json$/, '') || ''
            return `${window.location.origin}/iiif-proxy${path}`
        }
        return base
    } catch {
        return base
    }
}

export default function ManuscriptViewer({ imageId }: ManuscriptViewerProps): React.JSX.Element {
    // Always start with default value to avoid hydration mismatch
    const [annotationsEnabled, setAnnotationsEnabled] = React.useState<boolean>(true)
    
    // Load from localStorage only on client after mount
    React.useEffect(() => {
        if (typeof window === 'undefined') return
        const saved = localStorage.getItem(`annotationsVisible:${imageId}`)
        if (saved !== null) {
            setAnnotationsEnabled(saved === 'true')
        }
    }, [imageId])

    const [manuscriptImage, setManuscriptImage] = React.useState<ManuscriptImageType | null>(null)
    const [manuscript, setManuscript] = React.useState<Manuscript | null>(null)
    const [loading, setLoading] = React.useState<boolean>(true)
    const [error, setError] = React.useState<string | null>(null)
    const [selectedAllograph, setSelectedAllograph] = React.useState<Allograph | undefined>(undefined)
    const [selectedHand, setSelectedHand] = React.useState<HandType | undefined>(undefined)
    const [allographs, setAllographs] = React.useState<Allograph[]>([])
    const [imageAllographIds, setImageAllographIds] = React.useState<number[]>([])


    const viewerApiRef = React.useRef<ViewerApi | null>(null)
    const [osdReady, setOsdReady] = React.useState(false)

    const [initialA9sAnnots, setInitialA9sAnnots] = React.useState<A9sAnnotation[]>([])

    const [imageHeight, setImageHeight] = React.useState<number>(0)
    const [activeButton, setActiveButton] = React.useState<'move' | 'editorial' | 'delete'>('move')

    // track when OSD is in fullscreen
    const [isFullScreen, setIsFullScreen] = React.useState(false)

    const allographNameById = React.useMemo(
        () => new Map(allographs.map((a) => [a.id, a.name])),
        [allographs],
    )

    const [hoveredAllograph, setHoveredAllograph] = React.useState<Allograph | undefined>(undefined)

    const activeAllographId = hoveredAllograph?.id ?? selectedAllograph?.id ?? null
    React.useEffect(() => {
        if (!osdReady) return

        if (activeAllographId == null) {
            viewerApiRef.current?.clearHighlights?.()
            return
        }

        const annots = viewerApiRef.current?.getAnnotations?.() ?? []
        const ids = annots
            .filter((a) => a?._meta?.allographId === activeAllographId)
            .map((a) => a.id)

        viewerApiRef.current?.highlightAnnotations?.(ids)
    }, [activeAllographId, osdReady])

    const handleToggleFullScreen = () => {
        setIsFullScreen(prev => !prev)

        // OpenSeadragon recomputes its layout
        if (typeof window !== 'undefined') {
            setTimeout(() => {
                window.dispatchEvent(new Event('resize'))
            }, 0)
        }
    }

    const handleExposeApi = React.useCallback(
        (api: ViewerApi) => {
            viewerApiRef.current = api
            setOsdReady(true)

            // Initial tool setup
            api.enablePan()
            setActiveButton('move')
        },
        [],
    )

    // persist the unsaved counter so it survives reloads
    // Always start with 0 to avoid hydration mismatch
    const [unsavedChanges, setUnsavedChanges] = React.useState<number>(0)
    
    // Load from localStorage only on client after mount
    React.useEffect(() => {
        if (typeof window === 'undefined') return
        try {
            const saved = Number(localStorage.getItem(`unsaved:${imageId}`) || 0)
            if (saved > 0) {
                setUnsavedChanges(saved)
            }
        } catch {
            // ignore
        }
    }, [imageId])

    React.useEffect(() => {
        if (typeof window === 'undefined') return
        try {
            localStorage.setItem(`unsaved:${imageId}`, String(unsavedChanges))
        } catch {
            // ignore
        }
    }, [unsavedChanges, imageId])

    React.useEffect(() => {
        if (!osdReady) return
        viewerApiRef.current?.toggleAnnotations(annotationsEnabled)
    }, [annotationsEnabled, osdReady])

    // load image & size
    React.useEffect(() => {
        let isMounted = true
        const loadData = async () => {
            try {
                setLoading(true)
                const [image, allographsData] = await Promise.all([
                    fetchManuscriptImage(imageId),
                    fetchAllographs(),
                ])
                if (!isMounted) return
                setManuscriptImage(image)
                setAllographs(allographsData)
                fetchManuscript(image.item_part).then((m) => {
                    if (isMounted) setManuscript(m)
                })

                const baseUrl = browserSafeIiifUrl(image.iiif_image)
                const infoUrl = `${baseUrl}/info.json`
                try {
                    const infoRes = await fetch(infoUrl)
                    if (!infoRes.ok) throw new Error(`IIIF info: ${infoRes.status}`)
                    const info = await infoRes.json()
                    if (isMounted) setImageHeight(info.height ?? 2000)
                } catch {
                    if (isMounted) setImageHeight(2000)
                }
                if (isMounted) setError(null)
            } catch (err) {
                if (isMounted) {
                    setError(
                        err instanceof Error
                            ? err.message
                            : 'Failed to load manuscript data',
                    )
                }
            } finally {
                if (isMounted) setLoading(false)
            }
        }
        void loadData()
        return () => {
            isMounted = false
        }
    }, [imageId])

    React.useEffect(() => {
        if (!manuscriptImage) return
        let isMounted = true
        const loadAllographIds = async () => {
            try {
                const graphs = await fetchAnnotationsForImage(
                    String(manuscriptImage.id),
                )
                if (!isMounted) return
                const ids = Array.from(
                    new Set(
                        graphs
                            .map((g) => g.allograph)
                            .filter((id): id is number => typeof id === 'number'),
                    ),
                )
                setImageAllographIds(ids)
            } catch {
                if (isMounted) setImageAllographIds([])
            }
        }
        void loadAllographIds()
        return () => {
            isMounted = false
        }
    }, [manuscriptImage])

    const allographsForThisImage = React.useMemo(() => {
        if (!allographs.length) return []

        // If there are no graphs yet (new image), fall back to showing all allographs
        if (!imageAllographIds.length) return allographs

        const idSet = new Set(imageAllographIds)
        return allographs.filter((a) => idSet.has(a.id))
    }, [allographs, imageAllographIds])


    React.useEffect(() => {
        if (!manuscriptImage || !imageHeight) return
        let isMounted = true
        const load = async () => {
            try {
                const allographId = selectedAllograph?.id ? String(selectedAllograph.id) : undefined
                const list = await fetchAnnotationsForImage(String(manuscriptImage.id), allographId)
                if (!isMounted) return
                const dbMapped: A9sAnnotation[] = list.map(a => backendToA9sAnnotation(a, imageHeight, allographNameById.get(a.allograph),))
                const iiif = manuscriptImage.iiif_image
                const cacheKey = cacheKeyFor(iiif)
                const metaKey = metaKeyFor(iiif)
                let merged: A9sAnnotation[] = dbMapped
                if (typeof window !== 'undefined') {
                    try {
                        const raw = localStorage.getItem(cacheKey)
                        const meta = JSON.parse(localStorage.getItem(metaKey) || '{}') as { imageHeight?: number }
                        if (raw && meta?.imageHeight === imageHeight) {
                            const cached = JSON.parse(raw) as A9sAnnotation[]
                            const localOnly = Array.isArray(cached) ? cached.filter((a) => !isDbId(a?.id)) : []
                            const existing = new Set(dbMapped.map(a => a.id))
                            const extras = localOnly.filter((a) => !existing.has(a.id))
                            merged = [...dbMapped, ...extras]
                        } else if (raw && meta?.imageHeight !== imageHeight) {
                            localStorage.removeItem(cacheKey)
                            localStorage.removeItem(metaKey)
                        }
                    } catch {
                        // ignore
                    }
                }
                if (isMounted) setInitialA9sAnnots(merged)
            } catch {
                if (isMounted) setInitialA9sAnnots([])
            }
        }
        load()
        return () => {
            isMounted = false
        }
    }, [manuscriptImage, imageHeight, selectedAllograph, allographNameById])

    const handleMoveTool = () => {
        viewerApiRef.current?.enablePan()
        setActiveButton('move')
    }

    const handleCreateAnnotation = () => {
        viewerApiRef.current?.enableDraw()
        setActiveButton('editorial')
    }

    const handleDeleteTool = () => {
        viewerApiRef.current?.enableDelete()
        setActiveButton('delete')
    }

    // === SAVE ===
    const handleSave = React.useCallback(async (): Promise<void> => {
        try {
            const a9s = viewerApiRef.current?.getAnnotations() ?? []
            const tasks: Promise<BackendGraph>[] = []
            for (const a of a9s) {
                const feature = a9sToBackendFeature(a)
                if (isDbAnnotation(a)) {
                    const id = dbIdFromA9s(a)!
                    tasks.push(patchAnnotation(id, { annotation: feature }))
                } else {
                    tasks.push(postAnnotation({
                        item_image: Number(manuscriptImage!.id),
                        annotation: feature,
                        allograph: selectedAllograph?.id ?? 0,
                        hand: selectedHand?.id ?? 0,
                        graphcomponent_set: [],
                        positions: []
                    }))
                }
            }

            await Promise.all(tasks)
            setUnsavedChanges(0)
            if (typeof window !== 'undefined') {
                try {
                    localStorage.removeItem(`unsaved:${imageId}`)
                } catch {
                    // ignore
                }
            }

            // Reload DB → map → replace cache (drop local-only)
            const refreshed = await fetchAnnotationsForImage(
                String(manuscriptImage!.id),
                selectedAllograph?.id ? String(selectedAllograph.id) : undefined
            )
            const mapped = refreshed.map(a => backendToA9sAnnotation(a, imageHeight))

            if (typeof window !== 'undefined') {
                try {
                    localStorage.setItem(
                        `annotations:${manuscriptImage!.iiif_image}`,
                        JSON.stringify(mapped),
                    )
                    localStorage.setItem(
                        `annotations:meta:${manuscriptImage!.iiif_image}`,
                        JSON.stringify({ imageHeight }),
                    )
                } catch {
                    // ignore
                }
            }

            setInitialA9sAnnots(mapped)
        } catch {
            // save failed — leave unsaved count as is
        }
    }, [manuscriptImage, imageHeight, selectedAllograph, selectedHand, imageId])

    React.useEffect(() => {
        const handleKeyPress = (e: KeyboardEvent): void => {
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault()
                if (unsavedChanges > 0) void handleSave()
            }
        }
        window.addEventListener('keydown', handleKeyPress)
        return () => window.removeEventListener('keydown', handleKeyPress)
    }, [unsavedChanges, handleSave])

    if (loading) return <div className='flex h-screen items-center justify-center'>Loading...</div>
    if (error || !manuscriptImage) {
        return (
            <div className='flex h-screen items-center justify-center'>
                <div className='text-center'>
                    <p className='text-red-500 mb-4'>{error || 'Failed to load manuscript image'}</p>
                    <Button onClick={() => window.location.reload()}>Try Again</Button>
                </div>
            </div>
        )
    }

    const handleToggleAnnotations = () => {
        setAnnotationsEnabled(prev => {
            const next = !prev
            if (typeof window !== 'undefined') {
                try {
                    localStorage.setItem(`annotationsVisible:${imageId}`, String(next))
                } catch {
                    // ignore
                }
            }
            viewerApiRef.current?.toggleAnnotations(next)
            return next
        })
    }

    return (
        <div
            className={
                isFullScreen
                    ? 'fixed inset-0 z-50 flex flex-col bg-black'
                    : 'flex h-screen flex-col'
            }
        >
            {!isFullScreen && (
                <>
                    <header className='border-b bg-card px-4 py-2'>
                        <h1 className='text-lg font-semibold'>
                            Manuscript Image: <Link href={`/manuscripts/${manuscript?.id}`} className='text-blue-600 hover:underline'>{manuscript?.display_label}</Link>: {manuscriptImage.locus}
                        </h1>
                        <p className='text-sm text-muted-foreground line-clamp-3'>
                            {manuscript?.historical_item?.descriptions?.[0]?.content || 'No description available'}
                        </p>
                    </header>

                    <ManuscriptTabs />
                </>
            )}

            {isFullScreen ? (
                <div className='fixed top-0 left-0 right-0 z-40 bg-card/95 backdrop-blur border-b'>
                    <AnnotationHeader
                        annotationsEnabled={annotationsEnabled}
                        onToggleAnnotations={handleToggleAnnotations}
                        unsavedCount={unsavedChanges}
                        imageId={imageId}
                        onAllographSelect={setSelectedAllograph}
                        onHandSelect={setSelectedHand}
                        allographs={allographsForThisImage}
                        onAllographHover={setHoveredAllograph}
                    />
                </div>
            ) : (
                <AnnotationHeader
                    annotationsEnabled={annotationsEnabled}
                    onToggleAnnotations={handleToggleAnnotations}
                    unsavedCount={unsavedChanges}
                    imageId={imageId}
                    onAllographSelect={setSelectedAllograph}
                    onHandSelect={setSelectedHand}
                    allographs={allographsForThisImage}
                    onAllographHover={setHoveredAllograph}
                />
            )}

            <div className={`relative flex flex-1 ${isFullScreen ? 'mt-20' : ''}`}>
                <Toolbar>
                    <TooltipProvider>
                        <Tooltip><TooltipTrigger asChild><Button variant='ghost' size='icon' onClick={() => viewerApiRef.current?.goHome()}><Home className='h-4 w-4' /></Button></TooltipTrigger><TooltipContent>Reset View</TooltipContent></Tooltip>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant={isFullScreen ? 'default' : 'ghost'}
                                    size='icon'
                                    onClick={handleToggleFullScreen}
                                >
                                    {isFullScreen ? (
                                        <Expand className='h-4 w-4' />
                                    ) : (
                                        <LaptopMinimal className='h-4 w-4' />
                                    )}
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                {isFullScreen ? 'Exit Full Screen' : 'Full Screen'}
                            </TooltipContent>
                        </Tooltip>
                        <Tooltip><TooltipTrigger asChild><Button variant='ghost' size='icon' onClick={() => viewerApiRef.current?.zoomIn()}><ZoomIn className='h-4 w-4' /></Button></TooltipTrigger><TooltipContent>Zoom In</TooltipContent></Tooltip>
                        <Tooltip><TooltipTrigger asChild><Button variant='ghost' size='icon' onClick={() => viewerApiRef.current?.zoomOut()}><ZoomOut className='h-4 w-4' /></Button></TooltipTrigger><TooltipContent>Zoom Out</TooltipContent></Tooltip>
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
                        <Tooltip><TooltipTrigger asChild><Button variant='ghost' size='icon' onClick={() => void handleSave()} disabled={unsavedChanges === 0}><Save className='h-4 w-4' /></Button></TooltipTrigger><TooltipContent>Save</TooltipContent></Tooltip>
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
                        <Tooltip><TooltipTrigger asChild><Button variant='ghost' size='icon'><Expand className='h-4 w-4' /></Button></TooltipTrigger><TooltipContent>Modify</TooltipContent></Tooltip>
                        <Tooltip><TooltipTrigger asChild><Button variant='ghost' size='icon'><SquarePen className='h-4 w-4' /></Button></TooltipTrigger><TooltipContent>Draw</TooltipContent></Tooltip>
                        {manuscriptImage && manuscript && (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <div>
                                        <OpenLightboxButton
                                            item={{
                                                id: Number(imageId),
                                                type: 'image',
                                                image: manuscriptImage.iiif_image,
                                                shelfmark: manuscript.current_item?.shelfmark || '',
                                                locus: manuscriptImage.locus,
                                                repository_name: manuscript.current_item?.repository?.name || '',
                                                repository_city: manuscript.current_item?.repository?.place || '',
                                                date: manuscript.historical_item?.date || '',
                                            }}
                                            variant="ghost"
                                            size="icon"
                                        />
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent>Open in Lightbox</TooltipContent>
                            </Tooltip>
                        )}
                    </TooltipProvider>
                </Toolbar>

                <div
                    className={
                        isFullScreen
                            ? 'flex-1 overflow-hidden p-0'
                            : 'flex-1 overflow-hidden p-4'
                    }
                >
                    <div
                        className={
                            isFullScreen
                                ? 'relative h-full w-full overflow-hidden rounded-lg border bg-accent/50'
                                : 'relative h-[calc(100%-3rem)] w-full overflow-hidden rounded-lg border bg-accent/50 ml-10'
                        }
                    >
                        <ManuscriptAnnotorious
                            iiifImageUrl={browserSafeIiifUrl(manuscriptImage.iiif_image)}
                            initialAnnotations={initialA9sAnnots}
                            onCreate={() => {
                                if (typeof window !== 'undefined') {
                                    try {
                                        const iiif = manuscriptImage.iiif_image
                                        const cacheKey = cacheKeyFor(iiif)
                                        const metaKey = metaKeyFor(iiif)
                                        const all = viewerApiRef.current?.getAnnotations() ?? []
                                        localStorage.setItem(cacheKey, JSON.stringify(all))
                                        localStorage.setItem(metaKey, JSON.stringify({ imageHeight }))
                                    } catch {
                                        // ignore
                                    }
                                }
                                // unsaved counter: +1 for creates
                                setUnsavedChanges(n => n + 1)
                            }}
                            onDelete={(a: A9sAnnotation) => {
                                if (typeof window !== 'undefined') {
                                    try {
                                        const iiif = manuscriptImage.iiif_image
                                        const cacheKey = cacheKeyFor(iiif)
                                        const metaKey = metaKeyFor(iiif)
                                        const all = viewerApiRef.current?.getAnnotations() ?? []
                                        localStorage.setItem(cacheKey, JSON.stringify(all))
                                        localStorage.setItem(metaKey, JSON.stringify({ imageHeight }))
                                    } catch {
                                        // ignore
                                    }
                                }
                                const id = a?.id as string | undefined
                                if (id && !isDbId(id)) {
                                    // deleting a brand-new unsaved annotation reduces the counter
                                    setUnsavedChanges(n => Math.max(0, n - 1))
                                }
                            }}
                            onSelect={() => {}}
                            exposeApi={handleExposeApi}
                        />
                    </div>
                </div>
            </div>
        </div>
    )
}
