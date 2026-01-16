'use client'

import { useEffect, useRef } from 'react'
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

    // keep refs up to date without re-running the heavy OSD effect
    useEffect(() => { onCreateRef.current = onCreate }, [onCreate])
    useEffect(() => { onDeleteRef.current = onDelete }, [onDelete])
    useEffect(() => { onSelectRef.current = onSelect }, [onSelect])

    // also keep the latest initial annotations in a ref,
    // so the OSD 'open' handler doesn't capture an old (empty) array

    const initialAnnotsRef = useRef<Annotation[]>([])
    useEffect(() => {
        initialAnnotsRef.current = Array.isArray(initialAnnotations) ? initialAnnotations : []
    }, [initialAnnotations])

    // ---- Initialize OSD + Annotorious once per iiifImageUrl ----
    useEffect(() => {
        if (!viewerRef.current) return

        console.log('[Annotorious] OSD init for', iiifImageUrl)

        const viewer = OpenSeadragon({
            element: viewerRef.current,
            prefixUrl: 'https://openseadragon.github.io/openseadragon/images/',
            tileSources: `${iiifImageUrl}/info.json`,
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
        })

        osdRef.current = viewer

        viewer.addHandler('open', () => {
            console.log('[Annotorious] OSD image opened')

            if (!annoRef.current) {
                console.log('[Annotorious] Annotorious initialized')
                const anno = Annotorious(viewer, { widgets: [{ widget: 'COMMENT' }] })
                annoRef.current = anno

                //Use of the latest annotations (from ref) at the exact moment OSD opens
                const toApplyNow = initialAnnotsRef.current || []
                console.log(
                    '[Annotorious] Applying initial annotations:',
                    Array.isArray(toApplyNow) ? toApplyNow.length : 0,
                )
                if (Array.isArray(toApplyNow) && toApplyNow.length > 0) {
                    const existing = new Set(anno.getAnnotations().map((a: Annotation) => a.id))
                    let added = 0
                    toApplyNow.forEach(a => {
                        if (!existing.has(a.id)) {
                            try {
                                anno.addAnnotation(a)
                                added++
                            } catch (err) {
                                console.warn(
                                    '[Annotorious] Failed to add initial annotation',
                                    a,
                                    err,
                                )
                            }
                        }
                    })
                    if (added) {
                        try {
                            const all = anno.getAnnotations()
                            console.log(
                                '[Annotorious] After load, total annotations:',
                                all.length,
                            )
                            console.log(
                                '[Annotorious] Saved %d annotations after initial load',
                                all.length,
                            )
                        } catch (err) {
                            console.warn(
                                '[Annotorious] Failed to persist annotations after initial load',
                                err,
                            )
                        }
                    } else {
                        console.log(
                            '[Annotorious] No new initial annotations added on open (all existed)',
                        )
                    }
                } else {
                    console.log('[Annotorious] No initial annotations passed in on open')
                }

                // ---- Event listeners ----
                anno.on('createAnnotation', (a: Annotation) => {
                    try {
                        const all = anno.getAnnotations()
                        console.log(
                            '[Annotorious] Saved %d annotations (create)',
                            all.length,
                        )
                    } catch (err) {
                        console.warn(
                            '[Annotorious] Failed to save annotations on create',
                            err,
                        )
                    }
                    onCreateRef.current?.(a)
                })

                anno.on('deleteAnnotation', (a: Annotation) => {
                    try {
                        const all = anno.getAnnotations()
                        console.log(
                            '[Annotorious] Saved %d annotations (delete)',
                            all.length,
                        )
                    } catch (err) {
                        console.warn(
                            '[Annotorious] Failed to save annotations on delete',
                            err,
                        )
                    }
                    onDeleteRef.current?.(a)
                })

                anno.on('selectAnnotation', (a: Annotation | null) => {
                    onSelectRef.current?.(a)
                })

                anno.on('updateAnnotation', () => {
                    try {
                        const all = anno.getAnnotations()
                        console.log(
                            '[Annotorious] Saved %d annotations (update)',
                            all.length,
                        )
                    } catch (err) {
                        console.warn(
                            '[Annotorious] Failed to save annotations on update',
                            err,
                        )
                    }
                })

                // ---- Expose API ----
                let currentMode: 'pan' | 'draw' | 'delete' = 'pan'
                let deleteHandler: ((a: Annotation) => void) | null = null
                let rearmHandler: (() => void) | null = null

                exposeApi?.({
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
                        console.log('[Annotorious] Switched to Pan mode')

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
                        console.log('[Annotorious] Switched to Draw mode')

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
                        console.log('[Annotorious] Switched to Delete mode')


                        viewerRef.current?.classList.remove('osd-mode-pan', 'osd-mode-draw')
                        viewerRef.current?.classList.add('osd-mode-delete')

                        if (deleteHandler) anno.off('selectAnnotation', deleteHandler)
                        deleteHandler = (a: Annotation) => {
                            if (a && currentMode === 'delete') {
                                anno.removeAnnotation(a)
                                setTimeout(() => {
                                    try {
                                        const all = anno.getAnnotations()
                                        console.log(
                                            '[Annotorious] Saved %d annotations (delete via tool)',
                                            all.length,
                                        )
                                    } catch (err) {
                                        console.warn(
                                            '[Annotorious] Failed to save annotations on delete (tool)',
                                            err,
                                        )
                                    }
                                }, 0)
                                onDeleteRef.current?.(a)
                                console.log(
                                    '[Annotorious] Deleted annotation via Delete mode',
                                    a,
                                )
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
                        console.log(
                            visible
                                ? '[Annotorious] Annotations Visible'
                                : '[Annotorious] Annotations Hidden',
                        )
                        // small debug snapshot
                        try {
                            const all = anno?.getAnnotations?.() ?? []
                            console.log(
                                '[Annotorious] Current annotations count:',
                                Array.isArray(all) ? all.length : 0,
                            )
                        } catch (err) {
                            console.warn(
                                '[Annotorious] Failed to inspect annotations on visibility toggle',
                                err,
                            )
                        }
                    },

                    getAnnotations: () => annoRef.current?.getAnnotations?.() ?? []
                })
            }
        })

        // Debug: log tile-drawn events
        // viewer.addHandler('tile-drawn', (e: any) => {
        //     console.log('Tile drawn', e.tile?.level)
        // })

        // Clean up OSD + Annotorious
        return () => {
            try {
                viewer.destroy()
            } catch (err) {
                console.warn('[Annotorious] Failed to destroy OSD viewer', err)
            }
            try {
                annoRef.current?.destroy?.()
            } catch (err) {
                console.warn('[Annotorious] Failed to destroy Annotorious instance', err)
            }
        }


    }, [iiifImageUrl, exposeApi])

    // If DB/parent annotations arrive after OSD open, apply now (already exists)
    useEffect(() => {
        const anno = annoRef.current
        if (!anno || !initialAnnotations?.length) return

        const existing = new Set(anno.getAnnotations().map((a: Annotation) => a.id))
        let added = 0
        initialAnnotations.forEach((a) => {
            if (!existing.has(a.id)) {
                try {
                    anno.addAnnotation(a)
                    added++
                } catch (err) {
                    console.warn(
                        '[Annotorious] Failed to add late-arriving initial annotation',
                        a,
                        err,
                    )
                }
            }
        })

        if (added) {
            console.log(
                '[Annotorious] Applied %d late-arriving initial annotations',
                added,
            )
            try {
                const all = anno.getAnnotations()
                console.log(
                    '[Annotorious] Saved %d annotations after late apply',
                    all.length,
                )
            } catch (err) {
                console.warn(
                    '[Annotorious] Failed to persist annotations after late apply',
                    err,
                )
            }
        }
    }, [initialAnnotations, iiifImageUrl])

    return (
        <div style={{ width: '100vw', height: '100%', overflow: 'hidden' }}>
            <div
                ref={viewerRef}
                style={{ width: '100%', height: '100%', background: '#000', position: 'relative' }}
            />
        </div>
    )
}
