/**
 * Proposing one page's letters with the letter models (AI programme W1.1).
 *
 * A user's decision, page by page. Asking answers at once with a queued
 * request; a worker finds the page's letters and files the likeliest as
 * proposals in the review queue. The models run on this server. Superuser only.
 */

import { BackofficeApiError, backofficeGet, backofficePost } from './api-client';
import type { LetterRequest, PaginatedResponse } from '@/types/backoffice';

/** A request still in the making. */
export function isUnderWay(run: LetterRequest): boolean {
  return run.status === 'queued' || run.status === 'working';
}

export function requestPageLetters(itemImage: number): Promise<LetterRequest> {
  return backofficePost<LetterRequest>(`/api/v1/management/vision/pages/${itemImage}/letters/`, {});
}

/** The page's latest request. */
export function fetchPageLetters(itemImage: number): Promise<LetterRequest> {
  return backofficeGet<LetterRequest>(`/api/v1/management/vision/pages/${itemImage}/letters/`, {
    cache: 'no-store',
  });
}

/** The page's latest request, or null if nobody has asked for its letters. */
export async function fetchLatestPageLetters(itemImage: number): Promise<LetterRequest | null> {
  try {
    return await fetchPageLetters(itemImage);
  } catch (error) {
    if (error instanceof BackofficeApiError && error.status === 404) return null;
    throw error;
  }
}

/** Every request under way, on any page. */
export async function fetchLettersUnderWay(): Promise<LetterRequest[]> {
  const page = await backofficeGet<PaginatedResponse<LetterRequest>>(
    '/api/v1/management/vision/letters/?status=queued&status=working&limit=100',
    { cache: 'no-store' }
  );
  return page.results;
}
