import { adminGet, adminPost, adminPatch, adminDelete } from './api-client'
import type {
  PaginatedResponse,
  PublicationListItem,
  PublicationDetail,
  EventItem,
  CommentItem,
  CarouselItemAdmin,
} from '@/types/admin'

// ── Publications ────────────────────────────────────────────────────────

export function getPublications(
  token: string,
  params?: {
    limit?: number
    offset?: number
    status?: string
    is_blog_post?: boolean
    is_news?: boolean
    is_featured?: boolean
  }
) {
  const qs = new URLSearchParams()
  if (params?.limit) qs.set('limit', String(params.limit))
  if (params?.offset) qs.set('offset', String(params.offset))
  if (params?.status) qs.set('status', params.status)
  if (params?.is_blog_post) qs.set('is_blog_post', 'true')
  if (params?.is_news) qs.set('is_news', 'true')
  if (params?.is_featured) qs.set('is_featured', 'true')
  const query = qs.toString()
  return adminGet<PaginatedResponse<PublicationListItem>>(
    `/publications/publications/${query ? `?${query}` : ''}`,
    token
  )
}

export function getPublication(token: string, slug: string) {
  return adminGet<PublicationDetail>(
    `/publications/publications/${slug}/`,
    token
  )
}

export function createPublication(
  token: string,
  data: Partial<PublicationDetail>
) {
  return adminPost<PublicationDetail>(
    '/publications/publications/',
    token,
    data
  )
}

export function updatePublication(
  token: string,
  slug: string,
  data: Partial<PublicationDetail>
) {
  return adminPatch<PublicationDetail>(
    `/publications/publications/${slug}/`,
    token,
    data
  )
}

export function deletePublication(token: string, slug: string) {
  return adminDelete(`/publications/publications/${slug}/`, token)
}

// ── Events ──────────────────────────────────────────────────────────────

export function getEvents(token: string) {
  return adminGet<PaginatedResponse<EventItem>>(
    '/publications/events/',
    token
  )
}

export function getEvent(token: string, slug: string) {
  return adminGet<EventItem>(`/publications/events/${slug}/`, token)
}

export function createEvent(
  token: string,
  data: Partial<EventItem>
) {
  return adminPost<EventItem>('/publications/events/', token, data)
}

export function updateEvent(
  token: string,
  slug: string,
  data: Partial<EventItem>
) {
  return adminPatch<EventItem>(
    `/publications/events/${slug}/`,
    token,
    data
  )
}

export function deleteEvent(token: string, slug: string) {
  return adminDelete(`/publications/events/${slug}/`, token)
}

// ── Comments ────────────────────────────────────────────────────────────

export function getComments(
  token: string,
  params?: { is_approved?: boolean; post?: number }
) {
  const qs = new URLSearchParams()
  if (params?.is_approved !== undefined)
    qs.set('is_approved', String(params.is_approved))
  if (params?.post) qs.set('post', String(params.post))
  const query = qs.toString()
  return adminGet<PaginatedResponse<CommentItem>>(
    `/publications/comments/${query ? `?${query}` : ''}`,
    token
  )
}

export function approveComment(token: string, id: number) {
  return adminPost<CommentItem>(
    `/publications/comments/${id}/approve/`,
    token,
    {}
  )
}

export function rejectComment(token: string, id: number) {
  return adminPost<CommentItem>(
    `/publications/comments/${id}/reject/`,
    token,
    {}
  )
}

export function deleteComment(token: string, id: number) {
  return adminDelete(`/publications/comments/${id}/`, token)
}

// ── Carousel ────────────────────────────────────────────────────────────

export function getCarouselItems(token: string) {
  return adminGet<CarouselItemAdmin[]>(
    '/publications/carousel-items/',
    token
  )
}

export function createCarouselItem(
  token: string,
  data: Partial<CarouselItemAdmin>
) {
  return adminPost<CarouselItemAdmin>(
    '/publications/carousel-items/',
    token,
    data
  )
}

export function updateCarouselItem(
  token: string,
  id: number,
  data: Partial<CarouselItemAdmin>
) {
  return adminPatch<CarouselItemAdmin>(
    `/publications/carousel-items/${id}/`,
    token,
    data
  )
}

export function deleteCarouselItem(token: string, id: number) {
  return adminDelete(`/publications/carousel-items/${id}/`, token)
}
