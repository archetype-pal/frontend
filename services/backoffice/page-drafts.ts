/**
 * Drafting one page's transcription with a model (AI programme W1.4).
 *
 * A user's decision, page by page: nothing here drafts pages in bulk. Asking
 * answers at once with a queued draft; a worker reads the page in a minute or
 * two and files a Draft transcription for review. Superuser only.
 */

import { backofficeGet, backofficePost } from './api-client';
import type { PageDraft, PaginatedResponse } from '@/types/backoffice';

/** A draft still in the making. */
export function isUnderWay(draft: PageDraft): boolean {
  return draft.status === 'queued' || draft.status === 'working';
}

export function requestPageDraft(itemImage: number): Promise<PageDraft> {
  return backofficePost<PageDraft>(`/api/v1/management/vision/pages/${itemImage}/draft/`, {});
}

/** The page's latest draft. */
export function fetchPageDraft(itemImage: number): Promise<PageDraft> {
  return backofficeGet<PageDraft>(`/api/v1/management/vision/pages/${itemImage}/draft/`, {
    cache: 'no-store',
  });
}

/** Every draft under way, on any page. */
export async function fetchDraftsUnderWay(): Promise<PageDraft[]> {
  const page = await backofficeGet<PaginatedResponse<PageDraft>>(
    '/api/v1/management/vision/drafts/?status=queued&status=working&limit=100',
    { cache: 'no-store' }
  );
  return page.results;
}
