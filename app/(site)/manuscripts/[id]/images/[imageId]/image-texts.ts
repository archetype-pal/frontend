import { apiFetch, authFetch } from '@/lib/api-fetch';
import type { ImageTextDetail } from '@/services/image-texts';
import type { PaginatedResponse } from '@/types/backoffice';

async function readerFetch(path: string, token: string | null): Promise<Response> {
  if (token) {
    const response = await authFetch(path, token, { cache: 'no-store' });
    if (response.status !== 401) return response;
  }
  return apiFetch(path, { cache: 'no-store' });
}

export async function loadImageTexts(
  imageId: string,
  token: string | null
): Promise<ImageTextDetail[]> {
  const response = await readerFetch(
    `/api/v1/manuscripts/image-texts/?item_image=${imageId}`,
    token
  );
  if (!response.ok) return [];
  const data: PaginatedResponse<ImageTextDetail> | ImageTextDetail[] = await response.json();
  return Array.isArray(data) ? data : data.results;
}

export async function loadImageText(
  textId: string,
  token: string | null
): Promise<ImageTextDetail | null> {
  const response = await readerFetch(`/api/v1/manuscripts/image-texts/${textId}/`, token);
  return response.ok ? response.json() : null;
}
