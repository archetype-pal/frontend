import { notFound } from 'next/navigation'
import { HandViewer } from './hand-viewer'
import type { HandDetail, HandImage, HandScribe, HandManuscript, HandGraph } from '@/types/hand-detail'
import type { BackendGraph } from '@/services/annotations'
import type { Allograph } from '@/types/allographs'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

async function getHand(id: string): Promise<HandDetail> {
  const response = await fetch(`${API_BASE_URL}/api/v1/hands/${id}/`)
  if (!response.ok) {
    if (response.status === 404) notFound()
    throw new Error('Failed to fetch hand')
  }
  return response.json()
}

async function getHandImages(itemPartId: number): Promise<HandImage[]> {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/manuscripts/item-images/?item_part=${itemPartId}`
  )
  if (!response.ok) return []
  const data = await response.json()
  return data.results ?? data ?? []
}

async function getScribe(scribeId: number): Promise<HandScribe | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/scribes/${scribeId}/`)
    if (!response.ok) return null
    return response.json()
  } catch {
    return null
  }
}

async function getManuscript(itemPartId: number): Promise<HandManuscript | null> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/v1/manuscripts/item-parts/${itemPartId}`
    )
    if (!response.ok) return null
    return response.json()
  } catch {
    return null
  }
}

async function getHandGraphs(handId: string): Promise<BackendGraph[]> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/v1/manuscripts/graphs/?hand=${handId}`,
      { signal: AbortSignal.timeout(5000) }
    )
    if (!response.ok) return []
    const data = await response.json()
    return Array.isArray(data) ? data : data.results ?? []
  } catch {
    return []
  }
}

async function getAllographs(): Promise<Allograph[]> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/v1/symbols_structure/allographs/`,
      { signal: AbortSignal.timeout(5000) }
    )
    if (!response.ok) return []
    return response.json()
  } catch {
    return []
  }
}

function enrichGraphs(
  backendGraphs: BackendGraph[],
  allographs: Allograph[],
  images: HandImage[]
): HandGraph[] {
  // Build lookup maps
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

export default async function HandPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const hand = await getHand(id)

  // Fetch related data in parallel
  const [images, scribe, manuscript, backendGraphs, allographs] = await Promise.all([
    hand.item_part ? getHandImages(hand.item_part) : Promise.resolve([]),
    hand.scribe ? getScribe(hand.scribe) : Promise.resolve(null),
    hand.item_part ? getManuscript(hand.item_part) : Promise.resolve(null),
    getHandGraphs(id),
    getAllographs(),
  ])

  // Enrich graphs with allograph names and IIIF URLs
  const graphs = enrichGraphs(backendGraphs, allographs, images)

  return (
    <HandViewer
      hand={hand}
      images={images}
      scribe={scribe}
      manuscript={manuscript}
      graphs={graphs}
    />
  )
}
