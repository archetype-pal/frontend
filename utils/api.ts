import type { SearchResponse } from '@/types/manuscript'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

/** Build absolute URL for carousel (or other API-served) images. API returns relative paths like "media/carousel/…". */
export function getCarouselImageUrl(imagePath: string | null | undefined): string {
  if (!imagePath) return '/placeholder.svg'
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) return imagePath
  const base = API_BASE_URL.replace(/\/$/, '')
  return imagePath.startsWith('/') ? `${base}${imagePath}` : `${base}/${imagePath}`
}

export async function loginUser(username: string, password: string) {
  const response = await fetch(`${API_BASE_URL}/api/v1/auth/token/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ username, password }),
  })

  if (!response.ok) {
    throw new Error('Login failed')
  }

  return response.json()
}

export async function logoutUser(token: string) {
  const response = await fetch(`${API_BASE_URL}/api/v1/auth/token/logout`, {
    method: 'POST',
    headers: {
      Authorization: `Token ${token}`,
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error('Logout failed')
  }
}

export async function getUserProfile(token: string) {
  const response = await fetch(`${API_BASE_URL}/api/v1/auth/profile`, {
    headers: {
      Authorization: `Token ${token}`,
    },
  })

  if (!response.ok) {
    throw new Error('Failed to fetch user profile')
  }

  return response.json()
}

export async function getCarouselItems(token: string) {
  const response = await fetch(`${API_BASE_URL}/api/v1/media/carousel-items/`, {
    headers: {
      Authorization: `Token ${token}`,
    },
  })

  if (!response.ok) {
    throw new Error('Failed to fetch carousel items')
  }

  return response.json()
}

export type PublicationParams = {
  is_news?: boolean
  is_featured?: boolean
  is_blog_post?: boolean
  limit?: number
  offset?: number
}

export async function getPublications(params: PublicationParams) {
  const searchParams = new URLSearchParams()

  if (params.is_news) searchParams.append('is_news', 'true')
  if (params.is_featured) searchParams.append('is_featured', 'true')
  if (params.is_blog_post) searchParams.append('is_blog_post', 'true')

  if (params.limit) searchParams.append('limit', params.limit.toString())
  if (params.offset) searchParams.append('offset', params.offset.toString())

  const url = `${API_BASE_URL}/api/v1/media/publications/${searchParams.toString() ? `?${searchParams.toString()}` : ''
    }`

  const res = await fetch(url)
  if (!res.ok) throw new Error('Failed to fetch publications')

  return res.json()
}

export async function getPublicationItem(slug: string) {
  const url = `${API_BASE_URL}/api/v1/media/publications/${slug}`

  const res = await fetch(url)
  if (!res.ok) throw new Error('Failed to fetch publication item')

  return res.json()
}

export async function fetchCarouselItems() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/media/carousel-items/`)
    if (!response.ok) {
      throw new Error('Failed to fetch carousel items')
    }
    const data = await response.json()
    return data
  } catch (error) {
    console.error('Error fetching carousel items:', error)
    throw error
  }
}
