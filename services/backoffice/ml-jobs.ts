/**
 * The inference ledger (AI programme W0.1): one row per model call, written by
 * the system and read-only over HTTP, since a write path would be a way to
 * forge provenance. Superuser only.
 */

import { backofficeGet } from './api-client';
import { createCrudService } from './crud-factory';
import type {
  MLJobDetail,
  MLJobListItem,
  MLJobStatus,
  MLJobSummary,
  PaginatedResponse,
} from '@/types/backoffice';

const BASE = '/api/v1/management/ml-jobs/';

const jobsCrud = createCrudService<PaginatedResponse<MLJobListItem>, MLJobDetail>(BASE);

export function getMLJobs(params: {
  limit?: number;
  offset?: number;
  status?: MLJobStatus;
  task?: string;
}) {
  return jobsCrud.list(params);
}

/** One call, with its tokens, hashes, parameters, error and the records it touched. */
export const getMLJob = jobsCrud.get;

/** Whether inference can run, its spend against the caps, and how the window's calls ended. */
export function getMLJobSummary() {
  return backofficeGet<MLJobSummary>(`${BASE}summary/`, { cache: 'no-store' });
}
