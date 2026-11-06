import { cache } from 'react';
import type { Manuscript } from '@/types/manuscript';
import { apiFetch } from '@/lib/api-fetch';

/** The part, or null when there is none. One read per request: the layout and the page share it. */
export const loadManuscript = cache(async (id: string): Promise<Manuscript | null> => {
  const response = await apiFetch(`/api/v1/manuscripts/item-parts/${id}/`);
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Failed to fetch manuscript: ${response.status}`);
  return response.json();
});
