import { apiFetch, API_BASE_URL } from '@/lib/api-fetch'
import type { CarouselItem } from '@/types/backoffice'

export interface PublicationAuthor {
  first_name: string
  last_name: string
}

export interface Publication {
  id: number | string
  title: string
  slug: string
  content: string
  preview: string
  keywords: string
  status: string
  is_blog_post: boolean
  is_news: boolean
  is_featured: boolean
  allow_comments: boolean
  author: PublicationAuthor
  author_name: string | null
  published_at: string | null
  created_at: string
  updated_at: string
  number_of_comments: number
}

interface AuthToken {
  auth_token: string
}

interface UserProfile {
  id: number
  username: string
  email: string
  first_name: string
  last_name: string
  is_staff: boolean
}

interface PaginatedPublications {
  results: Publication[]
  count: number
}

/** Build absolute URL for carousel (or other API-served) images. API returns relative paths like "media/carousel/…". */
export function getCarouselImageUrl(imagePath: string | null | undefined): string {
  if (!imagePath) return '/placeholder.svg'
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) return imagePath
  const base = API_BASE_URL.replace(/\/$/, '')
  return imagePath.startsWith('/') ? `${base}${imagePath}` : `${base}/${imagePath}`
}

export async function loginUser(username: string, password: string): Promise<AuthToken> {
  const response = await apiFetch(`/api/v1/auth/token/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ username, password }),
  })

  if (!response.ok) {
    throw new Error('Login failed')
  }

  return response.json() as Promise<AuthToken>
}

export async function logoutUser(token: string) {
  const response = await apiFetch(`/api/v1/auth/token/logout`, {
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

export async function getUserProfile(token: string): Promise<UserProfile> {
  const response = await apiFetch(`/api/v1/auth/profile`, {
    headers: {
      Authorization: `Token ${token}`,
    },
  })

  if (!response.ok) {
    throw new Error('Failed to fetch user profile')
  }

  return response.json() as Promise<UserProfile>
}

export type PublicationParams = {
  is_news?: boolean
  is_featured?: boolean
  is_blog_post?: boolean
  limit?: number
  offset?: number
}

export async function getPublications(params: PublicationParams): Promise<PaginatedPublications> {
  const searchParams = new URLSearchParams()

  if (params.is_news) searchParams.append('is_news', 'true')
  if (params.is_featured) searchParams.append('is_featured', 'true')
  if (params.is_blog_post) searchParams.append('is_blog_post', 'true')

  if (params.limit) searchParams.append('limit', params.limit.toString())
  if (params.offset) searchParams.append('offset', params.offset.toString())

  const qs = searchParams.toString()
  const path = `/api/v1/media/publications/${qs ? `?${qs}` : ''}`

  const res = await apiFetch(path)
  if (!res.ok) throw new Error('Failed to fetch publications')

  return res.json() as Promise<PaginatedPublications>
}

export async function getPublicationItem(slug: string): Promise<Publication> {
  const res = await apiFetch(`/api/v1/media/publications/${slug}`)
  if (!res.ok) throw new Error('Failed to fetch publication item')

  return res.json() as Promise<Publication>
}

export async function fetchCarouselItems(): Promise<CarouselItem[]> {
  try {
    const response = await apiFetch(`/api/v1/media/carousel-items/`)
    if (!response.ok) {
      throw new Error('Failed to fetch carousel items')
    }
    const data: CarouselItem[] = await response.json()
    return data
  } catch (error) {
    console.error('Error fetching carousel items:', error)
    throw error
  }
}
