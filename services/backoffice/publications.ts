import { backofficePost } from './api-client'
import { createCrudService } from './crud-factory'
import type {
  PaginatedResponse,
  PublicationListItem,
  PublicationDetail,
  EventItem,
  CommentItem,
  CarouselItem,
} from '@/types/backoffice'

// ── Publications ────────────────────────────────────────────────────────

const publicationsCrud = createCrudService<
  PaginatedResponse<PublicationListItem>,
  PublicationDetail,
  string
>('/publications/publications/')

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
  return publicationsCrud.list(token, params)
}

export const getPublication = publicationsCrud.get
export const createPublication = publicationsCrud.create
export const updatePublication = publicationsCrud.update
export const deletePublication = publicationsCrud.remove

// ── Events ──────────────────────────────────────────────────────────────

const eventsCrud = createCrudService<
  PaginatedResponse<EventItem>,
  EventItem,
  string
>('/publications/events/')

export const getEvents = (token: string) => eventsCrud.list(token)
export const getEvent = eventsCrud.get
export const createEvent = eventsCrud.create
export const updateEvent = eventsCrud.update
export const deleteEvent = eventsCrud.remove

// ── Comments ────────────────────────────────────────────────────────────

const commentsCrud = createCrudService<
  PaginatedResponse<CommentItem>,
  CommentItem
>('/publications/comments/')

export function getComments(
  token: string,
  params?: { is_approved?: boolean; post?: number }
) {
  return commentsCrud.list(token, params)
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

export const deleteComment = commentsCrud.remove

// ── Carousel ────────────────────────────────────────────────────────────

const carouselCrud = createCrudService<CarouselItem>('/publications/carousel-items/')

export const getCarouselItems = (token: string) => carouselCrud.list(token)
export const createCarouselItem = carouselCrud.create
export const updateCarouselItem = carouselCrud.update
export const deleteCarouselItem = carouselCrud.remove
