import {
  backofficePost,
  backofficePostFormData,
  backofficePatchFormData,
} from './api-client'
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

const CAROUSEL_PATH = '/publications/carousel-items/'

const carouselCrud = createCrudService<CarouselItem[], CarouselItem>(CAROUSEL_PATH)

export const getCarouselItems = (token: string) => carouselCrud.list(token)
export const deleteCarouselItem = carouselCrud.remove

/** Plain JSON update (e.g. reordering). */
export const updateCarouselItemJson = carouselCrud.update

export interface CarouselItemPayload {
  title: string
  url?: string
  ordering?: number
  image?: File | null
}

function buildCarouselFormData(data: CarouselItemPayload): FormData {
  const fd = new FormData()
  fd.append('title', data.title)
  if (data.url !== undefined) fd.append('url', data.url)
  if (data.ordering !== undefined) fd.append('ordering', String(data.ordering))
  if (data.image) fd.append('image', data.image)
  return fd
}

/** Create a carousel item. Uses multipart when an image File is provided. */
export function createCarouselItem(
  token: string,
  data: CarouselItemPayload
): Promise<CarouselItem> {
  return backofficePostFormData<CarouselItem>(
    CAROUSEL_PATH,
    token,
    buildCarouselFormData(data)
  )
}

/** Update a carousel item. Uses multipart when an image File is provided. */
export function updateCarouselItem(
  token: string,
  id: number,
  data: Partial<CarouselItemPayload>
): Promise<CarouselItem> {
  const fd = new FormData()
  if (data.title !== undefined) fd.append('title', data.title)
  if (data.url !== undefined) fd.append('url', data.url)
  if (data.ordering !== undefined) fd.append('ordering', String(data.ordering))
  if (data.image) fd.append('image', data.image)
  return backofficePatchFormData<CarouselItem>(
    `${CAROUSEL_PATH}${id}/`,
    token,
    fd
  )
}
