import { cache } from 'react';
import type { ManuscriptImage } from '@/types/manuscript-image';
import { apiFetch } from '@/lib/api-fetch';

/** The image, or null when there is none. One read per request, shared by the layout and its header. */
export const loadImage = cache(async (id: string): Promise<ManuscriptImage | null> => {
  const response = await apiFetch(`/api/v1/manuscripts/item-images/${id}/`);
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Failed to fetch manuscript image: ${response.status}`);
  return response.json();
});
