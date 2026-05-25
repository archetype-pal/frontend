import { authFetch } from '@/lib/api-fetch';
import type { ImageTextStatus } from './review-queue';

export type BulkAction =
  | { ids: number[]; action: 'transition'; payload: { to_status: ImageTextStatus; note?: string } }
  | { ids: number[]; action: 'set_language'; payload: { language: string } }
  | { ids: number[]; action: 'delete' };

export async function bulkActionImageTexts(
  token: string,
  body: BulkAction
): Promise<{ affected: number }> {
  const r = await authFetch(`/api/v1/manuscripts/management/image-texts/bulk_action/`, token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    throw new Error(`Bulk action failed: ${r.status} ${await r.text()}`);
  }
  return r.json();
}
