import { backofficeGet } from './api-client';
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

export function fetchImageTextHistory(
  token: string,
  textId: number
): Promise<StatusTransitionRow[]> {
  return backofficeGet<StatusTransitionRow[]>(
    `/api/v1/manuscripts/management/image-texts/${textId}/history/`,
    token,
    { cache: 'no-store' }
  );
}
