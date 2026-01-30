export interface BackendGraph {
  id: number
  item_image: number
  annotation: {
    type: 'Feature'
    geometry: {
      type: 'Polygon'
      coordinates: number[][][] // [[[x,y],...]]
    }
    properties?: Record<string, unknown>
    crs?: unknown
  }
  allograph: number
  hand: number
  graphcomponent_set: Array<{ component: number; features: number[] }>
  positions: number[]
}

export interface SaveAnnotationRequest {
  id: string
  item_image: string
  annotation: {
    content: string
    type: string
    position: {
      x: number
      y: number
      width: number
      height: number
    }
  }
  allograph: string
  hand: string
  graphcomponent_set: Array<{
    component: number
    features: number[]
  }>
  positions: number[]
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export async function fetchAnnotationsForImage(
  imageId: string,
  allographId?: string
): Promise<BackendGraph[]> {
  const url = new URL(`${API_BASE_URL}/api/v1/manuscripts/graphs/`)
  url.searchParams.set('item_image', imageId)
  if (allographId) url.searchParams.set('allograph', allographId)
  const res = await fetch(url.toString(), { cache: 'no-store' })
  if (!res.ok) throw new Error('Failed to load annotations')
  return res.json()
}

export async function postAnnotation(payload: Omit<BackendGraph, 'id'>) {
  const res = await fetch(`${API_BASE_URL}/api/v1/manuscripts/graphs/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`POST failed: ${res.status} ${text}`)
  }
  return res.json() as Promise<BackendGraph>
}

export async function patchAnnotation(
  id: number,
  partial: Partial<Omit<BackendGraph, 'id'>>
) {
  const res = await fetch(`${API_BASE_URL}/api/v1/manuscripts/graphs/${id}/`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(partial)
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`PATCH failed: ${res.status} ${text}`)
  }
  return res.json() as Promise<BackendGraph>
}

export async function saveAnnotation(request: SaveAnnotationRequest): Promise<BackendGraph> {
  // Convert SaveAnnotationRequest to BackendGraph format
  const annotationId = request.id ? parseInt(request.id, 10) : null
  
  // Convert position to geometry coordinates (polygon format)
  const { x, y, width, height } = request.annotation.position
  const coordinates: number[][][] = [[
    [x, y],
    [x + width, y],
    [x + width, y + height],
    [x, y + height],
    [x, y] // close the polygon
  ]]

  const payload: Omit<BackendGraph, 'id'> = {
    item_image: parseInt(request.item_image, 10),
    annotation: {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates
      },
      properties: {
        content: request.annotation.content,
        type: request.annotation.type
      }
    },
    allograph: request.allograph ? parseInt(request.allograph, 10) : 0,
    hand: request.hand ? parseInt(request.hand, 10) : 0,
    graphcomponent_set: request.graphcomponent_set,
    positions: request.positions
  }

  if (annotationId && !isNaN(annotationId)) {
    // Update existing annotation
    return patchAnnotation(annotationId, payload)
  } else {
    // Create new annotation
    return postAnnotation(payload)
  }
}