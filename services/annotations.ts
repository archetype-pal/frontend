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

export async function saveAnnotation(data: SaveAnnotationRequest) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/manuscripts/graphs/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      throw new Error('Failed to save annotation')
    }

    return await response.json()
  } catch (error) {
    console.error('Error saving annotation:', error)
    throw error
  }
}
