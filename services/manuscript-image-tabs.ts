import { apiFetch } from '@/lib/api-fetch';
import type { ManuscriptImage } from '@/types/manuscript-image';

interface PaginatedItemImages {
  results?: ManuscriptImage[];
}

export async function fetchOtherImages(
  itemPartId: number,
  excludeImageId: number
): Promise<ManuscriptImage[]> {
  const response = await apiFetch(`/api/v1/manuscripts/item-images/?item_part=${itemPartId}`, {
    cache: 'no-store',
  });
  if (!response.ok) return [];
  const data: PaginatedItemImages | ManuscriptImage[] = await response.json();
  const images = Array.isArray(data) ? data : (data.results ?? []);
  return images.filter((img) => img.id !== excludeImageId);
}
