'use client'

import React, { useEffect, useRef } from 'react'
import OpenSeadragon from 'openseadragon'
import Annotorious from '@recogito/annotorious-openseadragon'

// ---- Annotation data model ----
export interface Annotation {
    id: string
    type: 'Annotation'
    body?: {
        value: string
        type?: string
        purpose?: string
    }[]
    target: unknown
    _meta?: {
        allographId?: number
        handId?: number
    }
}
type AnnotoriousInstance = ReturnType<typeof Annotorious>

// ---- API we expose upward (no ref needed) ----
export type ViewerApi = {
    zoomIn: () => void
    zoomOut: () => void
    goHome: () => void
    enablePan: () => void
    enableDraw: () => void
    enableDelete: () => void
    toggleAnnotations: (visible: boolean) => void
    getAnnotations: () => Annotation[]
    highlightAnnotations: (ids: string[]) => void
    clearHighlights: () => void
}

// ---- Component props ----
interface Props {
    iiifImageUrl: string
    onCreate?: (annotation: Annotation) => void
    onDelete?: (annotation: Annotation) => void
    onSelect?: (annotation: Annotation | null) => void
    exposeApi?: (api: ViewerApi) => void
    initialAnnotations?: Annotation[]
}

// ---- Component state ----
interface ComponentState {
    hasError: boolean
    errorMessage: string | null
    isLoading: boolean
}

// ---- Component ----
export default function ManuscriptAnnotorious({
    iiifImageUrl,
    onCreate,
    onDelete,
    onSelect,
    exposeApi,
    initialAnnotations = [],
}: Props) {
    const viewerRef = useRef<HTMLDivElement | null>(null)
    const osdRef = useRef<OpenSeadragon.Viewer | null>(null)
    const annoRef = useRef<AnnotoriousInstance | null>(null)
    const onCreateRef = useRef(onCreate)
    const onDeleteRef = useRef(onDelete)
    const onSelectRef = useRef(onSelect)
    const exposeApiRef = useRef(exposeApi)
    const [state, setState] = React.useState<ComponentState>({
        hasError: false,
        errorMessage: null,
        isLoading: true,
    })

    // keep refs up to date without re-running the heavy OSD effect
    useEffect(() => { onCreateRef.current = onCreate }, [onCreate])
    useEffect(() => { onDeleteRef.current = onDelete }, [onDelete])
    useEffect(() => { onSelectRef.current = onSelect }, [onSelect])
    useEffect(() => { exposeApiRef.current = exposeApi }, [exposeApi])

    // also keep the latest initial annotations in a ref,
    // so the OSD 'open' handler doesn't capture an old (empty) array

    const initialAnnotsRef = useRef<Annotation[]>([])
    useEffect(() => {
        initialAnnotsRef.current = Array.isArray(initialAnnotations) ? initialAnnotations : []
    }, [initialAnnotations])

    // ---- Initialize OSD + Annotorious once per iiifImageUrl ----
    useEffect(() => {
        if (!viewerRef.current) return

        let isMounted = true
        let viewer: InstanceType<typeof OpenSeadragon.Viewer> | null = null

        const baseUrl = iiifImageUrl.replace(/\/info\.json$/, '')
        const tileSourceUrl = `${baseUrl}/info.json`

        const opts = {
            element: viewerRef.current,
            prefixUrl: 'https://openseadragon.github.io/openseadragon/images/',
            showFullPageControl: false,
            showZoomControl: false,
            showHomeControl: false,
            showNavigator: true,
            visibilityRatio: 1,
            constrainDuringPan: true,
            gestureSettingsMouse: {
                clickToZoom: false,
                dblClickToZoom: false,
                dragToPan: true,
                scrollToZoom: true,
            },
        }

        void (async () => {
            let tileSources: string | Record<string, unknown> = tileSourceUrl
            if (baseUrl.includes('/iiif-proxy')) {
                try {
                    const res = await fetch(tileSourceUrl)
                    if (!res.ok) throw new Error(`IIIF info: ${res.status}`)
                    const obj = (await res.json()) as Record<string, unknown>
                    // OpenSeadragon supports IIIF Image API 2.x; Sipi often returns 3.0. Rewrite id and, if needed, convert to 2-style.
                    const id = baseUrl
                    if (obj.type === 'ImageService3') {
                        tileSources = {
                            '@context': 'http://iiif.io/api/image/2/context.json',
                            '@id': id,
                            protocol: obj.protocol ?? 'http://iiif.io/api/image',
                            width: obj.width,
                            height: obj.height,
                            profile: Array.isArray(obj.profile) ? obj.profile : [obj.profile],
                            tiles: obj.tiles ?? [{ scaleFactors: [1, 2, 4, 8, 16], width: 256 }],
                        }
                    } else {
                        tileSources = { ...obj, id: baseUrl, '@id': baseUrl }
                    }
                } catch (err) {
                    if (isMounted) {
                        setState({
                            hasError: true,
                            errorMessage: `Failed to load IIIF info: ${err instanceof Error ? err.message : String(err)}`,
                            isLoading: false,
                        })
                    }
                    return
                }
            }
            if (!isMounted) return

            viewer = OpenSeadragon({ ...opts, tileSources })
            osdRef.current = viewer

            viewer.addHandler('open-failed', (event: { message?: string }) => {
                if (!isMounted) return
                setState({
                    hasError: true,
                    errorMessage: `Failed to open image: ${event?.message ?? 'unknown'}. URL: ${tileSourceUrl}`,
                    isLoading: false,
                })
            })

            viewer.addHandler('tile-load-failed', () => {})

            viewer.addHandler('open', () => {
            if (!isMounted) return
            setState(prev => ({ ...prev, isLoading: false, hasError: false }))

            if (!annoRef.current) {
                const anno = Annotorious(viewer, { widgets: [{ widget: 'COMMENT' }] })
                annoRef.current = anno

                const toApplyNow = initialAnnotsRef.current ?? []
                if (Array.isArray(toApplyNow) && toApplyNow.length > 0) {
                    const existing = new Set(anno.getAnnotations().map((a: Annotation) => a.id))
                    for (const a of toApplyNow) {
                        if (!existing.has(a.id)) {
                            try {
                                anno.addAnnotation(a)
                            } catch {
                                // skip invalid annotation
                            }
                        }
                    }
                }

                anno.on('createAnnotation', (a: Annotation) => {
                    onCreateRef.current?.(a)
                })
                anno.on('deleteAnnotation', (a: Annotation) => {
                    onDeleteRef.current?.(a)
                })
                anno.on('selectAnnotation', (a: Annotation | null) => {
                    onSelectRef.current?.(a)
                })

                let currentMode: 'pan' | 'draw' | 'delete' = 'pan'
                let deleteHandler: ((a: Annotation) => void) | null = null
                let rearmHandler: (() => void) | null = null

                exposeApiRef.current?.({
                    zoomIn: () => {
                        const v = osdRef.current
                        v?.viewport.zoomBy(1.2)
                        v?.viewport.applyConstraints()
                    },
                    zoomOut: () => {
                        const v = osdRef.current
                        v?.viewport.zoomBy(0.8)
                        v?.viewport.applyConstraints()
                    },
                    goHome: () => osdRef.current?.viewport.goHome(),

                    // --- MOVE TOOL ---
                    enablePan: () => {
                        const anno = annoRef.current
                        if (!anno) return

                        if (deleteHandler) { anno.off('selectAnnotation', deleteHandler); deleteHandler = null }
                        if (rearmHandler) {
                            anno.off('createAnnotation', rearmHandler)
                            anno.off('cancelSelected', rearmHandler)
                            anno.off('updateAnnotation', rearmHandler)
                            rearmHandler = null
                        }

                        anno.setDrawingEnabled(false)
                        currentMode = 'pan'
                        viewerRef.current?.classList.remove('osd-mode-draw', 'osd-mode-delete')
                        viewerRef.current?.classList.add('osd-mode-pan')
                    },

                    // --- DRAW TOOL ---
                    enableDraw: () => {
                        const anno = annoRef.current
                        if (!anno) return

                        if (deleteHandler) { anno.off('selectAnnotation', deleteHandler); deleteHandler = null }

                        anno.setDrawingEnabled(true)
                        currentMode = 'draw'
                        viewerRef.current?.classList.remove('osd-mode-pan', 'osd-mode-delete')
                        viewerRef.current?.classList.add('osd-mode-draw')

                        const rearm = () => {
                            if (currentMode === 'draw') setTimeout(() => anno.setDrawingEnabled(true), 0)
                        }
                        if (rearmHandler) {
                            anno.off('createAnnotation', rearmHandler)
                            anno.off('cancelSelected', rearmHandler)
                            anno.off('updateAnnotation', rearmHandler)
                        }
                        rearmHandler = rearm
                        anno.on('createAnnotation', rearmHandler)
                        anno.on('cancelSelected', rearmHandler)
                        anno.on('updateAnnotation', rearmHandler)
                    },

                    // --- DELETE TOOL ---
                    enableDelete: () => {
                        const anno = annoRef.current
                        if (!anno) return

                        if (rearmHandler) {
                            anno.off('createAnnotation', rearmHandler)
                            anno.off('cancelSelected', rearmHandler)
                            anno.off('updateAnnotation', rearmHandler)
                            rearmHandler = null
                        }

                        anno.setDrawingEnabled(false)
                        currentMode = 'delete'
                        viewerRef.current?.classList.remove('osd-mode-pan', 'osd-mode-draw')
                        viewerRef.current?.classList.add('osd-mode-delete')

                        if (deleteHandler) anno.off('selectAnnotation', deleteHandler)
                        deleteHandler = (a: Annotation) => {
                            if (a && currentMode === 'delete') {
                                anno.removeAnnotation(a)
                                onDeleteRef.current?.(a)
                            }
                        }
                        anno.on('selectAnnotation', deleteHandler)
                    },

                    // --- SHOW/HIDE ANNOTATIONS ---
                    toggleAnnotations: (visible: boolean) => {
                        const anno = annoRef.current
                        if (anno && typeof anno.setVisible === 'function') {
                            anno.setVisible(visible)
                            if (!visible) {
                                anno.setDrawingEnabled(false)
                                if (deleteHandler) { anno.off('selectAnnotation', deleteHandler); deleteHandler = null }
                                currentMode = 'pan'
                            }
                        } else {
                            const layer = viewerRef.current?.querySelector<SVGSVGElement>('.a9s-annotationlayer')
                            if (layer) layer.style.display = visible ? 'block' : 'none'
                        }
                    },

                    highlightAnnotations: (ids: string[]) => {
                        const root = viewerRef.current
                        if (!root) return

                        // Remove highlight from all first
                        root.querySelectorAll<SVGGElement>('g.a9s-annotation.a9s-highlight')
                            .forEach(el => el.classList.remove('a9s-highlight'))

                        // Add highlight to requested ids
                        ids.forEach((id) => {
                            const el = root.querySelector<SVGGElement>(`g.a9s-annotation[data-id="${id}"]`)
                            if (el) el.classList.add('a9s-highlight')
                        })
                    },

                    clearHighlights: () => {
                        const root = viewerRef.current
                        if (!root) return
                        root.querySelectorAll<SVGGElement>('g.a9s-annotation.a9s-highlight')
                            .forEach(el => el.classList.remove('a9s-highlight'))
                    },

                    getAnnotations: () => annoRef.current?.getAnnotations?.() ?? []
                })
            }
        });
        })();

        return () => {
            isMounted = false
            const prev = annoRef.current
            annoRef.current = null
            try {
                (prev as { destroy?: () => void })?.destroy?.()
            } catch {
                // ignore
            }
            const v = osdRef.current
            osdRef.current = null
            try {
                v?.destroy?.()
            } catch {
                // ignore
            }
        }
    }, [iiifImageUrl])

    useEffect(() => {
        const anno = annoRef.current
        if (!anno || !Array.isArray(initialAnnotations) || initialAnnotations.length === 0) return

        const existing = new Set(anno.getAnnotations().map((a: Annotation) => a.id))
        for (const a of initialAnnotations) {
            if (!existing.has(a.id)) {
                try {
                    anno.addAnnotation(a)
                } catch {
                    // skip invalid annotation
                }
            }
        }
    }, [initialAnnotations, iiifImageUrl])

    if (state.hasError) {
        return (
            <div style={{ width: '100%', height: '100%', background: '#000', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ color: '#fff', textAlign: 'center', padding: '2rem', maxWidth: '600px' }}>
                    <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem', fontWeight: 'bold' }}>Image Load Error</h3>
                    <p style={{ marginBottom: '1rem', opacity: 0.9 }}>{state.errorMessage}</p>
                    <button
                        onClick={() => {
                            setState({ hasError: false, errorMessage: null, isLoading: true })
                            // Trigger a re-render by updating the key or reloading
                            window.location.reload()
                        }}
                        style={{
                            padding: '0.5rem 1rem',
                            backgroundColor: '#3b82f6',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '0.25rem',
                            cursor: 'pointer',
                        }}
                    >
                        Reload Page
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div style={{ width: '100vw', height: '100%', overflow: 'hidden', position: 'relative' }}>
            {state.isLoading && (
                <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    color: '#fff',
                    zIndex: 10,
                }}>
                    Loading image...
                </div>
            )}
            <div
                ref={viewerRef}
                style={{ width: '100%', height: '100%', background: '#000', position: 'relative' }}
            />
        </div>
    )
}
