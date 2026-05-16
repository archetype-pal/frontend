import { authFetch } from '@/lib/api-fetch';

export type ImageTextStatus = 'Draft' | 'Review' | 'Live' | 'Reviewed';

export interface ImageTextDetail {
  id: number;
  item_image: number;
  type: string;
  content: string;
  status: ImageTextStatus;
  language: string;
  created: string;
  modified: string;
}

interface PaginatedImageTexts {
  count: number;
  next: string | null;
  previous: string | null;
  results: ImageTextDetail[];
}

export async function fetchImageTextsForImage(
  imageId: string | number,
  token?: string | null
): Promise<ImageTextDetail[]> {
  const response = await authFetch(
    `/api/v1/manuscripts/image-texts/?item_image=${imageId}`,
    token ?? null,
    { cache: 'no-store' }
  );
  if (!response.ok) return [];
  const data: PaginatedImageTexts | ImageTextDetail[] = await response.json();
  if (Array.isArray(data)) return data;
  return data.results;
}

export async function fetchImageText(
  textId: string | number,
  token?: string | null
): Promise<ImageTextDetail | null> {
  const response = await authFetch(`/api/v1/manuscripts/image-texts/${textId}/`, token ?? null, {
    cache: 'no-store',
  });
  if (!response.ok) return null;
  return response.json();
}

export async function updateImageText(
  token: string,
  textId: number,
  payload: Partial<Pick<ImageTextDetail, 'content' | 'status' | 'language' | 'type'>>
): Promise<ImageTextDetail> {
  const response = await authFetch(`/api/v1/manuscripts/management/image-texts/${textId}/`, token, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to update image text: ${response.status} ${text}`);
  }
  return response.json();
}
