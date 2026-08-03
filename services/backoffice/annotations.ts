import { backofficeDelete, backofficePost } from './api-client';
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

export function getTrashedGraphs(token: string, params?: { limit?: number; offset?: number }) {
  return graphsCrud.list(token, { ...params, deleted: 'true' });
}

/** Bring a trashed annotation back; its text↔image links come back with it. */
export function restoreGraph(token: string, id: number) {
  return backofficePost<GraphItem>(`${GRAPHS_BASE}${id}/restore/`, token, {});
}

/** Permanently delete a trashed annotation. Cannot be undone. */
export function purgeGraph(token: string, id: number) {
  return backofficeDelete(`${GRAPHS_BASE}${id}/purge/`, token);
}
