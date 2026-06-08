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

export interface TeiValidationError {
  line: number;
  col: number;
  message: string;
}

export interface TeiValidationResult {
  valid: boolean;
  errors: TeiValidationError[];
}

export async function validateTei(content: string, token: string): Promise<TeiValidationResult> {
  const response = await authFetch('/api/v1/manuscripts/image-texts/validate-tei/', token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  });
  if (!response.ok) {
    throw new Error(`Validation request failed: ${response.status}`);
  }
  return response.json();
}

export interface LinkRegionResult {
  graph_id: number;
  content: string;
}

/**
 * Track A — create a TEXT-typed Graph for a drawn region and link it to the
 * `element_index`-th linkable element of the given image-text. Returns the new
 * graph id and the updated (TEI) content. Superuser-gated server-side.
 */
export async function linkRegionToElement(
  token: string,
  textId: number,
  elementIndex: number,
  geometry?: unknown,
  graphId?: number
): Promise<LinkRegionResult> {
  // Pass graphId to attach an EXISTING region to a second element (e.g. the same
  // region's translation phrase); otherwise pass geometry to create a new region.
  const body: Record<string, unknown> =
    graphId != null
      ? { element_index: elementIndex, graph_id: graphId }
      : { element_index: elementIndex, geometry };
  const response = await authFetch(
    `/api/v1/manuscripts/management/image-texts/${textId}/link-region/`,
    token,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }
  );
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Failed to link region: ${response.status}`);
  }
  return response.json();
}

/**
 * Track A — remove a text↔region link: delete the region's TEXT Graph and strip
 * its `corresp` reference from every text of the same image. `textId` may be any
 * image-text of that image. Returns the updated content of the addressed text.
 */
export async function unlinkRegion(
  token: string,
  textId: number,
  graphId: number
): Promise<{ content: string }> {
  const response = await authFetch(
    `/api/v1/manuscripts/management/image-texts/${textId}/unlink-region/`,
    token,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ graph_id: graphId }),
    }
  );
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Failed to unlink region: ${response.status}`);
  }
  return response.json();
}

export interface CreateImageTextPayload {
  item_image: number;
  type: 'Transcription' | 'Translation';
  language?: string;
  content?: string;
  status?: ImageTextStatus;
}

export async function createImageText(
  token: string,
  payload: CreateImageTextPayload
): Promise<ImageTextDetail> {
  const response = await authFetch(`/api/v1/manuscripts/management/image-texts/`, token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      status: 'Draft',
      content: '',
      language: '',
      ...payload,
    }),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Failed to create image text: ${response.status}`);
  }
  return response.json();
}

export async function deleteImageText(token: string, textId: number): Promise<void> {
  const response = await authFetch(`/api/v1/manuscripts/management/image-texts/${textId}/`, token, {
    method: 'DELETE',
  });
  if (!response.ok && response.status !== 204) {
    const text = await response.text();
    throw new Error(text || `Failed to delete image text: ${response.status}`);
  }
}
