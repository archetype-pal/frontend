import { backofficeDelete, backofficeGet, backofficePost } from './api-client';
import { createCrudService } from './crud-factory';
import type { PaginatedResponse, GraphItem } from '@/types/backoffice';

// ── Graphs ───────────────────────────────────────────────────────────────

const GRAPHS_BASE = '/api/v1/management/annotations/graphs/';

const graphsCrud = createCrudService<PaginatedResponse<GraphItem>, GraphItem>(GRAPHS_BASE);

export function getGraphs(
  token: string,
  params?: {
    item_image?: number;
    annotation_type?: string;
    hand?: number;
    allograph?: number;
    limit?: number;
    offset?: number;
  }
) {
  return graphsCrud.list(token, params);
}

export const getGraph = graphsCrud.get;
export const updateGraph = graphsCrud.update;
export const deleteGraph = graphsCrud.remove;

// ── Trash (soft-deleted graphs) ──────────────────────────────────────────
// Delete above is a soft delete server-side; these manage the trash itself.

export function getTrashedGraphs(
  token: string,
  params?: {
    limit?: number;
    offset?: number;
    annotation_type?: string;
    deleted_by__username?: string;
    /** ISO 8601 instant — use Date.toISOString(), not a naive local string. */
    deleted_at__gte?: string;
    deleted_at__lte?: string;
  }
) {
  return graphsCrud.list(token, { ...params, deleted: 'true' });
}

/**
 * Usernames with at least one trashed annotation — the "deleted by" filter's
 * options. Not the full user list: a user who trashed nothing would only ever
 * filter down to an empty result.
 */
export function getTrashActors(token: string) {
  return backofficeGet<string[]>(`${GRAPHS_BASE}trash-actors/`, token);
}

/** Bring a trashed annotation back; its text↔image links come back with it. */
export function restoreGraph(token: string, id: number) {
  return backofficePost<GraphItem>(`${GRAPHS_BASE}${id}/restore/`, token, {});
}

/** Permanently delete a trashed annotation. Cannot be undone. */
export function purgeGraph(token: string, id: number) {
  return backofficeDelete(`${GRAPHS_BASE}${id}/purge/`, token);
}
