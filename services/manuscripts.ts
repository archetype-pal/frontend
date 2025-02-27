import type { SearchResponse } from '@/types/manuscript'
import type { ManuscriptImage } from '@/types/manuscript-image'
import type { HandsResponse } from '@/types/hands'
import type { AllographsResponse } from '@/types/allographs'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export async function fetchManuscripts(page = 1) {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/v1/search/item-parts/facets?page=${page}`
    )
    if (!response.ok) {
      throw new Error('Failed to fetch manuscripts')
    }
    const data: SearchResponse = await response.json()
    return data
  } catch (error) {
    console.error('Error fetching manuscripts:', error)
    throw error
  }
}

export async function fetchManuscriptImage(
  id: string
): Promise<ManuscriptImage> {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/manuscripts/item-images/${id}`
  )

  if (!response.ok) {
    throw new Error('Failed to fetch manuscript image')
  }

  return response.json()
}

export async function fetchHands(itemImageId: string): Promise<HandsResponse> {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/v1/hands?item_image=${itemImageId}`
  )

  if (!response.ok) {
    throw new Error('Failed to fetch hands')
  }

  return response.json()
}

export async function fetchAllographs(): Promise<AllographsResponse> {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/v1/symbols_structure/allographs/`
  )

  if (!response.ok) {
    throw new Error('Failed to fetch allographs')
  }

  return response.json()
}
