import { backofficeGet, backofficePost, backofficePatch, backofficeDelete } from './api-client'
import type {
  PaginatedResponse,
  PublicationListItem,
  PublicationDetail,
  EventItem,
  CommentItem,
  CarouselItem,
} from '@/types/backoffice'

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
  return backofficeGet<PaginatedResponse<PublicationListItem>>(
    `/publications/publications/${query ? `?${query}` : ''}`,
    token
  )
}

export function getPublication(token: string, slug: string) {
  return backofficeGet<PublicationDetail>(
    `/publications/publications/${slug}/`,
    token
  )
}

export function createPublication(
  token: string,
  data: Partial<PublicationDetail>
) {
  return backofficePost<PublicationDetail>(
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
  return backofficePatch<PublicationDetail>(
    `/publications/publications/${slug}/`,
    token,
    data
  )
}

export function deletePublication(token: string, slug: string) {
  return backofficeDelete(`/publications/publications/${slug}/`, token)
}

// ── Events ──────────────────────────────────────────────────────────────

export function getEvents(token: string) {
  return backofficeGet<PaginatedResponse<EventItem>>(
    '/publications/events/',
    token
  )
}

export function getEvent(token: string, slug: string) {
  return backofficeGet<EventItem>(`/publications/events/${slug}/`, token)
}

export function createEvent(
  token: string,
  data: Partial<EventItem>
) {
  return backofficePost<EventItem>('/publications/events/', token, data)
}

export function updateEvent(
  token: string,
  slug: string,
  data: Partial<EventItem>
) {
  return backofficePatch<EventItem>(
    `/publications/events/${slug}/`,
    token,
    data
  )
}

export function deleteEvent(token: string, slug: string) {
  return backofficeDelete(`/publications/events/${slug}/`, token)
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
  return backofficeGet<PaginatedResponse<CommentItem>>(
    `/publications/comments/${query ? `?${query}` : ''}`,
    token
  )
}

export function approveComment(token: string, id: number) {
  return backofficePost<CommentItem>(
    `/publications/comments/${id}/approve/`,
    token,
    {}
  )
}

export function rejectComment(token: string, id: number) {
  return backofficePost<CommentItem>(
    `/publications/comments/${id}/reject/`,
    token,
    {}
  )
}

export function deleteComment(token: string, id: number) {
  return backofficeDelete(`/publications/comments/${id}/`, token)
}

// ── Carousel ────────────────────────────────────────────────────────────

export function getCarouselItems(token: string) {
  return backofficeGet<CarouselItem[]>(
    '/publications/carousel-items/',
    token
  )
}

export function createCarouselItem(
  token: string,
  data: Partial<CarouselItem>
) {
  return backofficePost<CarouselItem>(
    '/publications/carousel-items/',
    token,
    data
  )
}

export function updateCarouselItem(
  token: string,
  id: number,
  data: Partial<CarouselItem>
) {
  return backofficePatch<CarouselItem>(
    `/publications/carousel-items/${id}/`,
    token,
    data
  )
}

export function deleteCarouselItem(token: string, id: number) {
  return backofficeDelete(`/publications/carousel-items/${id}/`, token)
}
