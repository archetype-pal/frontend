import { apiFetch, authFetch } from '@/lib/api-fetch';
import type {
  WorksetDetail,
  WorksetPayload,
  WorksetSummary,
  WorksetVisibility,
} from '@/types/workset';

const BASE = '/api/v1/worksets/';

interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

/**
 * Fetch a single workset by its citable public id, anonymously (no token).
 * Returns null on 404 so callers can render `notFound()` — a Private workset or
 * an unknown id both 404 for non-owners.
 */
export async function getWorkset(publicId: string): Promise<WorksetDetail | null> {
  const response = await apiFetch(`${BASE}${encodeURIComponent(publicId)}/`, { cache: 'no-store' });
  // Only a genuine 404 means "unknown or private" → null (→ notFound()).
  // A transient 5xx/429 must NOT masquerade as a deleted workset on a citable
  // URL, so surface it as an error for the caller's error boundary instead.
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`Failed to load workset: ${response.status}`);
  }
  return response.json();
}

/** The authenticated caller's own worksets (metadata only — no payload). */
export async function listMyWorksets(token: string): Promise<WorksetSummary[]> {
  const response = await authFetch(BASE, token, { cache: 'no-store' });
  if (!response.ok) return [];
  const data: Paginated<WorksetSummary> | WorksetSummary[] = await response.json();
  return Array.isArray(data) ? data : data.results;
}

export interface WorksetInput {
  title: string;
  description?: string;
  visibility?: WorksetVisibility;
  payload: WorksetPayload;
}

export async function createWorkset(token: string, input: WorksetInput): Promise<WorksetDetail> {
  const response = await authFetch(BASE, token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    throw new Error((await response.text()) || `Failed to create workset: ${response.status}`);
  }
  return response.json();
}

export async function updateWorkset(
  token: string,
  publicId: string,
  patch: Partial<WorksetInput>
): Promise<WorksetDetail> {
  const response = await authFetch(`${BASE}${encodeURIComponent(publicId)}/`, token, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  });
  if (!response.ok) {
    throw new Error((await response.text()) || `Failed to update workset: ${response.status}`);
  }
  return response.json();
}

export async function deleteWorkset(token: string, publicId: string): Promise<void> {
  const response = await authFetch(`${BASE}${encodeURIComponent(publicId)}/`, token, {
    method: 'DELETE',
  });
  if (!response.ok && response.status !== 204) {
    throw new Error((await response.text()) || `Failed to delete workset: ${response.status}`);
  }
}
