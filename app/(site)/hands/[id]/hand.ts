import { cache } from 'react';
import type { HandDetail } from '@/types/hand-detail';
import { apiFetch } from '@/lib/api-fetch';

/** The hand, or null when there is none. One read per request: the layout and the page share it. */
export const loadHand = cache(async (id: string): Promise<HandDetail | null> => {
  const response = await apiFetch(`/api/v1/hands/${id}/`);
  if (response.status === 404) return null;
  if (!response.ok) throw new Error('Failed to fetch hand');
  return response.json();
});
