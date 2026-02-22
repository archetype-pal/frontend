import { backofficeGet, backofficePost } from './api-client';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface IndexStats {
  index_type: string;
  uid: string;
  label: string;
  meilisearch_count: number;
  db_count: number;
  in_sync: boolean;
}

export interface SearchEngineStats {
  healthy: boolean;
  total_meilisearch: number;
  total_database: number;
  indexes: IndexStats[];
  error?: string;
}

export type TaskAction =
  | 'reindex'
  | 'clear'
  | 'clean_and_reindex'
  | 'reindex_all'
  | 'clear_and_rebuild_all';

export interface TaskActionResponse {
  task_id?: string;
  task_ids?: string[];
  message: string;
}

export interface TaskProgress {
  current: number;
  total: number;
  message: string;
  index_done: number;
  index_total: number;
}

export type TaskState = 'PENDING' | 'STARTED' | 'PROGRESS' | 'SUCCESS' | 'FAILURE';

export interface TaskStatus {
  task_id: string;
  state: TaskState;
  progress: TaskProgress | null;
  result: Record<string, unknown> | null;
  error: string | null;
}

/* ------------------------------------------------------------------ */
/*  API functions                                                      */
/* ------------------------------------------------------------------ */

export function getSearchEngineStats(token: string): Promise<SearchEngineStats> {
  return backofficeGet<SearchEngineStats>('/search/stats/', token);
}

export function dispatchSearchAction(
  token: string,
  action: TaskAction,
  indexType?: string
): Promise<TaskActionResponse> {
  const body: Record<string, string> = { action };
  if (indexType) body.index_type = indexType;
  return backofficePost<TaskActionResponse>('/search/actions/', token, body);
}

export function getTaskStatus(token: string, taskId: string): Promise<TaskStatus> {
  return backofficeGet<TaskStatus>(`/search/tasks/${taskId}/`, token);
}
