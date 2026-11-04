/**
 * The public diplomatic collections, read anonymously. A signed-in editor sees
 * the same as anyone here; drafts' records are for the backoffice.
 */

import { apiFetch } from '@/lib/api-fetch';
import type { PaginatedResponse } from '@/types/backoffice';
import type { DiplomaticSummary, Formula } from '@/types/diplomatic';

export interface FormulaeQuery {
  kind?: string;
  search?: string;
  limit: number;
  offset: number;
}

export async function getFormulae(query: FormulaeQuery): Promise<PaginatedResponse<Formula>> {
  const params = new URLSearchParams({ limit: String(query.limit), offset: String(query.offset) });
  if (query.kind) params.set('kind', query.kind);
  if (query.search) params.set('search', query.search);
  const response = await apiFetch(`/api/v1/diplomatic/formulae/?${params}`, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Failed to load the formulary: ${response.status}`);
  }
  return response.json();
}

/** How much approved material there is to show, by kind. */
export async function getDiplomaticSummary(): Promise<DiplomaticSummary> {
  const response = await apiFetch('/api/v1/diplomatic/summary/', { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Failed to load the diplomatic summary: ${response.status}`);
  }
  return response.json();
}
