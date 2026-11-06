/**
 * The reviewer queue and a text's status transitions. The queue serves the
 * same rows as the management texts list, so it reuses `ImageTextListRow`.
 */

import { proxyFetch } from '@/lib/api-fetch';

import type { ImageTextStatus } from '@/types/image-text';
import type { ImageTextListRow } from './image-texts-list';

export async function fetchReviewQueue(): Promise<ImageTextListRow[]> {
  const r = await proxyFetch('/api/v1/manuscripts/management/review-queue/', {
    cache: 'no-store',
  });
  // Throw on non-OK so TanStack Query surfaces `isError` (retry/error UI)
  // instead of resolving with `[]` — which would render a 401/403/500 as an
  // empty queue indistinguishable from a genuinely empty one. The empty-array
  // fallback is reserved for a genuinely empty 200 response from the backend.
  if (!r.ok) {
    throw new Error(`Failed to load review queue: ${r.status} ${await r.text()}`);
  }
  return r.json();
}

export interface TransitionPayload {
  to_status: ImageTextStatus;
  note?: string;
  assignee?: number | null;
}

export async function transitionImageText(
  id: number,
  payload: TransitionPayload
): Promise<ImageTextListRow> {
  const r = await proxyFetch(`/api/v1/manuscripts/management/image-texts/${id}/transition/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!r.ok) throw new Error(`Transition failed: ${r.status} ${await r.text()}`);
  return r.json();
}
