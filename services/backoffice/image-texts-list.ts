/**
 * Backoffice list service for ImageText management.
 *
 * The public `services/image-texts.ts` covers single-record reads and PATCH
 * updates that the editor needs. This module adds the paginated, filterable
 * list query that the `/backoffice/texts` workbench consumes.
 */

import { authFetch } from '@/lib/api-fetch';
import type { ImageTextStatus } from './review-queue';

export type ImageTextKind = 'Transcription' | 'Translation';

export interface ImageTextListRow {
  id: number;
  item_image: number;
  item_part_id: number | null;
  item_image_locus: string;
  item_image_label: string;
  content: string;
  char_count: number;
  is_empty: boolean;
  type: ImageTextKind;
  status: ImageTextStatus;
  language: string;
  review_assignee: number | null;
  review_assignee_username: string | null;
  last_transition: {
    id: number;
    from_status: ImageTextStatus;
    to_status: ImageTextStatus;
    actor: number | null;
    actor_username: string | null;
    note: string;
    created: string;
  } | null;
  created: string;
  modified: string;
}

export interface PaginatedImageTextList {
  count: number;
  next: string | null;
  previous: string | null;
  results: ImageTextListRow[];
}

export interface ImageTextListParams {
  page?: number;
  pageSize?: number;
  status?: ImageTextStatus | '';
  type?: ImageTextKind | '';
  /** Backend special-cases `__unset__` to match `language=""`. */
  language?: string;
  empty?: boolean;
  reviewAssignee?: number | '';
  search?: string;
}

const PAGE_SIZE = 25;

export async function fetchImageTextList(
  token: string,
  params: ImageTextListParams = {}
): Promise<PaginatedImageTextList> {
  const qs = new URLSearchParams();
  const pageSize = params.pageSize ?? PAGE_SIZE;
  const page = params.page ?? 0;
  qs.set('limit', String(pageSize));
  qs.set('offset', String(page * pageSize));
  if (params.status) qs.set('status', params.status);
  if (params.type) qs.set('type', params.type);
  if (params.language) qs.set('language', params.language);
  if (params.empty !== undefined) qs.set('empty', params.empty ? 'true' : 'false');
  if (params.reviewAssignee) qs.set('review_assignee', String(params.reviewAssignee));
  if (params.search) qs.set('search', params.search);

  const r = await authFetch(`/api/v1/manuscripts/management/image-texts/?${qs.toString()}`, token, {
    cache: 'no-store',
  });
  if (!r.ok) {
    throw new Error(`Failed to fetch image-text list: ${r.status}`);
  }
  return r.json();
}

export const IMAGE_TEXT_PAGE_SIZE = PAGE_SIZE;
