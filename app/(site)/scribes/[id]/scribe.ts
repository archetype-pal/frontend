import { cache } from 'react';
import type { ScribeDetail } from '@/types/scribe-detail';
import { apiFetch } from '@/lib/api-fetch';

/** The scribe, or null when there is none. One read per request: the layout and the page share it. */
export const loadScribe = cache(async (id: string): Promise<ScribeDetail | null> => {
  const response = await apiFetch(`/api/v1/scribes/${id}/`);
  if (response.status === 404) return null;
  if (!response.ok) throw new Error('Failed to fetch scribe');
  return response.json();
});
