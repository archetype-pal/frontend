import { backofficePost, backofficePostFormData, backofficePatchFormData } from './api-client';
import { createCrudService } from './crud-factory';
import type {
  PaginatedResponse,
  PublicationListItem,
  PublicationDetail,
  CommentItem,
  CarouselItem,
} from '@/types/backoffice';
import { normalizeCarouselImagePath } from '@/utils/api';

// ── Publications ────────────────────────────────────────────────────────

const publicationsCrud = createCrudService<
  PaginatedResponse<PublicationListItem>,
  PublicationDetail,
  string
>('/api/v1/media/management/publications/');

export function getPublications(params?: {
  limit?: number;
  offset?: number;
  search?: string;
  status?: string;
  is_blog_post?: boolean;
  is_news?: boolean;
  is_featured?: boolean;
  ordering?: string;
}) {
  return publicationsCrud.list(params);
}

export const getPublication = publicationsCrud.get;
export const createPublication = publicationsCrud.create;
export const updatePublication = publicationsCrud.update;
export const deletePublication = publicationsCrud.remove;

// ── Comments ────────────────────────────────────────────────────────────

const commentsCrud = createCrudService<PaginatedResponse<CommentItem>, CommentItem>(
  '/api/v1/media/management/comments/'
);

export function getComments(params?: {
  limit?: number;
  offset?: number;
  search?: string;
  is_approved?: boolean;
  post?: number;
}) {
  return commentsCrud.list(params);
}

export function approveComment(id: number) {
  return backofficePost<CommentItem>(`/api/v1/media/management/comments/${id}/approve/`, {});
}

export function rejectComment(id: number) {
  return backofficePost<CommentItem>(`/api/v1/media/management/comments/${id}/reject/`, {});
}

export const deleteComment = commentsCrud.remove;

// ── Carousel ────────────────────────────────────────────────────────────

const CAROUSEL_PATH = '/api/v1/media/management/carousel-items/';

const carouselCrud = createCrudService<CarouselItem[], CarouselItem>(CAROUSEL_PATH);

export const getCarouselItems = () => carouselCrud.list();
export const deleteCarouselItem = carouselCrud.remove;

/** Plain JSON update (e.g. reordering). */
export const updateCarouselItemJson = carouselCrud.update;

export interface CarouselItemPayload {
  title: string;
  url?: string;
  ordering?: number;
  image?: File | string | null;
}

function buildCarouselFormData(data: Partial<CarouselItemPayload>): FormData {
  const fd = new FormData();
  if (data.title !== undefined) fd.append('title', data.title);
  if (data.url !== undefined) fd.append('url', data.url);
  if (data.ordering !== undefined) fd.append('ordering', String(data.ordering));
  if (data.image instanceof File) {
    fd.append('image', data.image);
  } else if (typeof data.image === 'string' && data.image.trim().length > 0) {
    fd.append('image', normalizeCarouselImagePath(data.image));
  }
  return fd;
}

/** Create a carousel item. Uses multipart when an image File is provided. */
export function createCarouselItem(data: CarouselItemPayload): Promise<CarouselItem> {
  return backofficePostFormData<CarouselItem>(CAROUSEL_PATH, buildCarouselFormData(data));
}

/** Update a carousel item. Uses multipart when an image File is provided. */
export function updateCarouselItem(
  id: number,
  data: Partial<CarouselItemPayload>
): Promise<CarouselItem> {
  return backofficePatchFormData<CarouselItem>(
    `${CAROUSEL_PATH}${id}/`,
    buildCarouselFormData(data)
  );
}
