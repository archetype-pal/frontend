'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import Image from 'next/image'
import Link from 'next/link'
import { getIiifImageUrl } from '@/utils/iiif'
import { useIiifThumbnailUrl } from '@/hooks/use-iiif-thumbnail'
import { useTabNavigation } from '@/hooks/use-tab-navigation'
import type { HandDetail, HandImage, HandScribe, HandManuscript, HandGraph } from '@/types/hand-detail'
import type { BackendGraph } from '@/services/annotations'
import type { Allograph } from '@/types/allographs'
import { BookOpen, Calendar, MapPin, PenTool, User, FileText, ImageIcon, Grid3X3, Loader2 } from 'lucide-react'
import { apiFetch } from '@/lib/api-fetch'

const TAB_VALUES = ['information', 'description', 'images', 'graphs'] as const
const DEFAULT_TAB = 'information'

interface HandViewerProps {
  hand: HandDetail
  images: HandImage[]
  scribe: HandScribe | null
  manuscript: HandManuscript | null
}

/** A single graph thumbnail that resolves its IIIF crop URL. */
function GraphThumbnail({ graph }: { graph: HandGraph }) {
  const imageUrl = useIiifThumbnailUrl(graph.image_iiif, graph.coordinates)

  return (
    <div className="relative w-20 h-20 border rounded bg-white overflow-hidden group/thumb">
      {imageUrl ? (
        <Image
          src={imageUrl}
          alt={graph.allograph_name}
          fill
          className="object-contain transition-transform duration-200 group-hover/thumb:scale-110"
          sizes="80px"
          unoptimized
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-muted-foreground/40">
          <ImageIcon className="h-5 w-5" />
        </div>
      )}
    </div>
  )
}

// ── Client-side graph fetching ──────────────────────────────────────

function enrichGraphs(
  backendGraphs: BackendGraph[],
  allographs: Allograph[],
  images: HandImage[]
): HandGraph[] {
  const allographMap = new Map(allographs.map((a) => [a.id, a.name]))
  const imageMap = new Map(images.map((img) => [img.id, img.iiif_image]))

  return backendGraphs
    .map((g) => {
      const iiifImage = imageMap.get(g.item_image)
      if (!iiifImage) return null

      return {
        id: g.id,
        allograph_name: allographMap.get(g.allograph) ?? `Allograph ${g.allograph}`,
        allograph_id: g.allograph,
        image_iiif: iiifImage.endsWith('/info.json') ? iiifImage : `${iiifImage}/info.json`,
        coordinates: JSON.stringify(g.annotation),
      }
    })
    .filter((g): g is HandGraph => g !== null)
}

type GraphsState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'loaded'; graphs: HandGraph[] }
  | { status: 'error' }

function useHandGraphs(handId: number, images: HandImage[], enabled: boolean): GraphsState {
  const [state, setState] = useState<GraphsState>({ status: 'idle' })
  const fetchedRef = useRef(false)

  useEffect(() => {
    if (!enabled || fetchedRef.current) return
    fetchedRef.current = true

    const controller = new AbortController()
    setState({ status: 'loading' })

    Promise.all([
      apiFetch(`/api/v1/manuscripts/graphs/?hand=${handId}`, {
        signal: controller.signal,
      }).then((r) => (r.ok ? r.json() : [])),
      apiFetch(`/api/v1/symbols_structure/allographs/`, {
        signal: controller.signal,
      }).then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([rawGraphs, allographs]) => {
        const graphsArr: BackendGraph[] = Array.isArray(rawGraphs)
          ? rawGraphs
          : rawGraphs?.results ?? []
        const graphs = enrichGraphs(graphsArr, allographs, images)
        setState({ status: 'loaded', graphs })
      })
      .catch((err) => {
        if (err?.name === 'AbortError') return
        setState({ status: 'error' })
      })

    return () => controller.abort()
  }, [enabled, handId, images])

  return state
}

// ── Main component ──────────────────────────────────────────────────

export function HandViewer({ hand, images, scribe, manuscript }: HandViewerProps) {
  const { activeTab, handleTabChange } = useTabNavigation(TAB_VALUES, DEFAULT_TAB)

  const manuscriptLabel =
    manuscript?.display_label ??
    manuscript?.current_item?.shelfmark ??
    (hand.shelfmark || null)

  // Lazy-load graphs only when the Graphs tab is active
  const graphsState = useHandGraphs(hand.id, images, activeTab === 'graphs')
  const graphs = graphsState.status === 'loaded' ? graphsState.graphs : []

  // Group graphs by allograph, preserving order of first appearance
  const graphGroups = useMemo(() => {
    const groupMap = new Map<string, { allograph_id: number; allograph_name: string; graphs: HandGraph[] }>()
    for (const g of graphs) {
      const key = `${g.allograph_id}-${g.allograph_name}`
      if (!groupMap.has(key)) {
        groupMap.set(key, { allograph_id: g.allograph_id, allograph_name: g.allograph_name, graphs: [] })
      }
      groupMap.get(key)!.graphs.push(g)
    }
    return Array.from(groupMap.values())
  }, [graphs])

  const scrollToAllograph = useCallback((allographId: number, allographName: string) => {
    const key = `${allographId}-${allographName}`
    const el = document.getElementById(`allograph-${key}`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [])

  return (
    <main className="container mx-auto p-4 max-w-6xl">
      {/* Header */}
      <div className="mb-6">
        <p className="text-sm text-muted-foreground mb-1">
          <Link href="/search/hands" className="hover:underline">
            Hands
          </Link>
          {manuscriptLabel && (
            <>
              {' / '}
              {hand.item_part ? (
                <Link
                  href={`/manuscripts/${hand.item_part}`}
                  className="hover:underline"
                >
                  {manuscriptLabel}
                </Link>
              ) : (
                manuscriptLabel
              )}
            </>
          )}
        </p>
        <h1 className="text-3xl font-medium text-foreground">
          <span className="text-muted-foreground font-normal">Hand: </span>
          {hand.name}
        </h1>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <TabsList className="bg-gray-100 p-1">
          <TabsTrigger value="information">Information</TabsTrigger>
          <TabsTrigger value="description">Description</TabsTrigger>
          <TabsTrigger value="images">
            Manuscript Images ({images.length})
          </TabsTrigger>
          <TabsTrigger value="graphs">
            Graphs{graphsState.status === 'loaded' ? ` (${graphs.length})` : ''}
          </TabsTrigger>
        </TabsList>

        {/* Information Tab */}
        <TabsContent value="information" className="space-y-6">
          <div className="rounded-lg border bg-card p-6">
            <h2 className="text-lg font-semibold mb-4">Hand Details</h2>
            <dl className="grid grid-cols-[180px_1fr] gap-x-4 gap-y-3">
              <dt className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <PenTool className="h-4 w-4" />
                Name
              </dt>
              <dd className="text-sm">{hand.name}</dd>

              {manuscriptLabel && (
                <>
                  <dt className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <BookOpen className="h-4 w-4" />
                    Manuscript
                  </dt>
                  <dd className="text-sm">
                    {hand.item_part ? (
                      <Link
                        href={`/manuscripts/${hand.item_part}`}
                        className="text-primary hover:underline"
                      >
                        {manuscriptLabel}
                      </Link>
                    ) : (
                      manuscriptLabel
                    )}
                  </dd>
                </>
              )}

              {hand.script && (
                <>
                  <dt className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Script
                  </dt>
                  <dd className="text-sm">{hand.script}</dd>
                </>
              )}

              {scribe && (
                <>
                  <dt className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Scribe
                  </dt>
                  <dd className="text-sm">
                    <Link
                      href={`/scribes/${scribe.id}`}
                      className="text-primary hover:underline"
                    >
                      {scribe.name}
                      {scribe.period && (
                        <span className="text-muted-foreground">
                          {'. '}
                          {scribe.period}
                        </span>
                      )}
                    </Link>
                  </dd>
                </>
              )}

              {hand.date && (
                <>
                  <dt className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Date
                  </dt>
                  <dd className="text-sm">{hand.date}</dd>
                </>
              )}

              {hand.place && (
                <>
                  <dt className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Place
                  </dt>
                  <dd className="text-sm">{hand.place}</dd>
                </>
              )}
            </dl>
          </div>
        </TabsContent>

        {/* Description Tab */}
        <TabsContent value="description">
          <div className="rounded-lg border bg-card p-6">
            {hand.description ? (
              <div
                className="prose max-w-none"
                dangerouslySetInnerHTML={{ __html: hand.description }}
              />
            ) : (
              <div className="flex items-center gap-2 text-muted-foreground bg-muted/50 rounded-md p-4">
                <FileText className="h-4 w-4" />
                <span>No description associated to this record.</span>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Manuscript Images Tab */}
        <TabsContent value="images" className="space-y-6">
          {images.length > 0 ? (
            <section className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {images.map((image) => (
                <Link
                  key={image.id}
                  href={`/manuscripts/${image.item_part}/images/${image.id}`}
                  className="group"
                >
                  <div className="relative bg-card border rounded-lg p-4 transition-shadow hover:shadow-md">
                    <div className="relative aspect-square bg-muted/30 rounded overflow-hidden">
                      {image.iiif_image ? (
                        <Image
                          src={getIiifImageUrl(image.iiif_image, { thumbnail: true })}
                          alt={image.locus || 'Manuscript image'}
                          fill
                          className="object-contain group-hover:scale-105 transition-transform duration-200"
                          unoptimized
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <ImageIcon className="h-12 w-12 text-muted-foreground/30" />
                        </div>
                      )}
                    </div>
                    <div className="mt-3 text-center">
                      <p className="text-sm font-medium">{image.locus}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {image.number_of_annotations} Annotation{image.number_of_annotations !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </section>
          ) : (
            <div className="rounded-lg border bg-card p-6">
              <div className="flex items-center gap-2 text-muted-foreground bg-muted/50 rounded-md p-4">
                <ImageIcon className="h-4 w-4" />
                <span>No manuscript images associated to this hand.</span>
              </div>
            </div>
          )}
        </TabsContent>

        {/* Graphs Tab */}
        <TabsContent value="graphs" className="space-y-6">
          {graphsState.status === 'loading' || graphsState.status === 'idle' ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">Loading graphs...</span>
            </div>
          ) : graphsState.status === 'error' ? (
            <div className="rounded-lg border bg-card p-6">
              <div className="flex items-center gap-2 text-destructive bg-destructive/10 rounded-md p-4">
                <Grid3X3 className="h-4 w-4" />
                <span>Failed to load graphs. Please try again later.</span>
              </div>
            </div>
          ) : graphs.length > 0 ? (
            <div className="space-y-6">
              {/* Hand name heading */}
              <h2 className="text-xl font-semibold">{hand.name}</h2>

              {/* Allographs List navigation */}
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">Allographs List</h3>
                <div className="flex flex-wrap gap-1.5">
                  {graphGroups.map((group) => (
                    <button
                      key={`${group.allograph_id}-${group.allograph_name}`}
                      onClick={() => scrollToAllograph(group.allograph_id, group.allograph_name)}
                      className="px-2.5 py-1 text-xs font-medium rounded border bg-primary/10 text-primary hover:bg-primary/20 transition-colors cursor-pointer"
                    >
                      {group.allograph_name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Allograph sections */}
              <div className="space-y-8">
                {graphGroups.map((group) => {
                  const key = `${group.allograph_id}-${group.allograph_name}`
                  return (
                    <section
                      key={key}
                      id={`allograph-${key}`}
                      className="scroll-mt-4"
                    >
                      <div className="border-b pb-2 mb-4">
                        <h4 className="text-base font-semibold">{group.allograph_name}</h4>
                      </div>
                      <div className="flex flex-wrap gap-3">
                        {group.graphs.map((graph) => (
                          <GraphThumbnail key={graph.id} graph={graph} />
                        ))}
                      </div>
                    </section>
                  )
                })}
              </div>
            </div>
          ) : (
            <div className="rounded-lg border bg-card p-6">
              <div className="flex items-center gap-2 text-muted-foreground bg-muted/50 rounded-md p-4">
                <Grid3X3 className="h-4 w-4" />
                <span>No graphs associated to this hand.</span>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </main>
  )
}
