import { authFetch } from '@/lib/api-fetch';
import { walkPaginated } from '@/lib/backoffice/walk-paginated';

export interface EditEvent {
  id: number;
  actor: number | null;
  actor_username: string | null;
  action: 'created' | 'updated' | 'deleted' | 'status_changed' | 'commented';
  target_type: string;
  target_id: number;
  summary: string;
  payload: Record<string, unknown> | null;
  created: string;
}

interface PaginatedEvents {
  count: number;
  next: string | null;
  previous: string | null;
  results: EditEvent[];
}

export async function fetchEventsForTarget(
  targetType: string,
  targetId: number,
  token?: string | null
): Promise<EditEvent[]> {
  // Walk all pages so the History tab doesn't silently hide events past
  // the DRF default page size (20). The backend doesn't expose ordering, so
  // sort newest-first on the client — users expect recent activity at the
  // top of the timeline.
  const events = await walkPaginated<EditEvent>(
    `/api/v1/common/edit-events/?target_type=${encodeURIComponent(targetType)}&target_id=${targetId}&limit=100`,
    (path) => authFetch(path, token, { cache: 'no-store' })
  );
  return events.sort((a, b) => (a.created < b.created ? 1 : a.created > b.created ? -1 : 0));
}

export async function fetchRecentEvents(token?: string | null, limit = 50): Promise<EditEvent[]> {
  const r = await authFetch(`/api/v1/common/edit-events/?limit=${limit}`, token, {
    cache: 'no-store',
  });
  if (!r.ok) return [];
  const d: PaginatedEvents | EditEvent[] = await r.json();
  return Array.isArray(d) ? d : d.results;
}
