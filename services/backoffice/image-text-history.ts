import { authFetch } from '@/lib/api-fetch';
import type { ImageTextStatus } from './review-queue';

export interface StatusTransitionRow {
  id: number;
  from_status: ImageTextStatus;
  to_status: ImageTextStatus;
  actor: number | null;
  actor_username: string | null;
  note: string;
  created: string;
}

export async function fetchImageTextHistory(
  token: string,
  textId: number
): Promise<StatusTransitionRow[]> {
  const r = await authFetch(
    `/api/v1/manuscripts/management/image-texts/${textId}/history/`,
    token,
    { cache: 'no-store' }
  );
  if (!r.ok) {
    throw new Error(`Failed to fetch transition history: ${r.status}`);
  }
  return r.json();
}
