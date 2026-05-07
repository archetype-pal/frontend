/**
 * Phase G — reviewer queue + status transitions.
 *
 * Mirrors `apps/manuscripts/views.py:ReviewQueueViewSet` and the
 * `transition` action on `ImageTextManagementViewSet`. The queue is
 * staff-only; the actions assume the caller is a reviewer.
 */

import { authFetch } from '@/lib/api-fetch';

export type ImageTextStatus = 'Draft' | 'Review' | 'Live' | 'Reviewed';

export interface QueueEntry {
  id: number;
  item_image: number;
  type: string;
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

export async function fetchReviewQueue(token: string): Promise<QueueEntry[]> {
  const r = await authFetch('/api/v1/manuscripts/management/review-queue/', token, {
    cache: 'no-store',
  });
  if (!r.ok) return [];
  return r.json();
}

export interface TransitionPayload {
  to_status: ImageTextStatus;
  note?: string;
  assignee?: number | null;
}

export async function transitionImageText(
  token: string,
  id: number,
  payload: TransitionPayload
): Promise<QueueEntry> {
  const r = await authFetch(`/api/v1/manuscripts/management/image-texts/${id}/transition/`, token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!r.ok) throw new Error(`Transition failed: ${r.status} ${await r.text()}`);
  return r.json();
}
