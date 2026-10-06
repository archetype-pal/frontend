import { optionalAuthFetch, proxyFetch } from '@/lib/api-fetch';
import { BackofficeApiError } from '@/services/backoffice/api-client';

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
  authenticated = false
): Promise<ImageTextDetail[]> {
  const response = await optionalAuthFetch(
    `/api/v1/manuscripts/image-texts/?item_image=${imageId}`,
    authenticated,
    { cache: 'no-store' }
  );
  if (!response.ok) return [];
  const data: PaginatedImageTexts | ImageTextDetail[] = await response.json();
  if (Array.isArray(data)) return data;
  return data.results;
}

export async function fetchImageText(
  textId: string | number,
  authenticated = false
): Promise<ImageTextDetail | null> {
  const response = await optionalAuthFetch(
    `/api/v1/manuscripts/image-texts/${textId}/`,
    authenticated,
    { cache: 'no-store' }
  );
  if (!response.ok) return null;
  return response.json();
}

export async function updateImageText(
  textId: number,
  payload: Partial<Pick<ImageTextDetail, 'content' | 'status' | 'language' | 'type'>>
): Promise<ImageTextDetail> {
  const response = await proxyFetch(`/api/v1/manuscripts/management/image-texts/${textId}/`, {
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

export async function validateTei(content: string): Promise<TeiValidationResult> {
  const response = await proxyFetch('/api/v1/manuscripts/image-texts/validate-tei/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  });
  if (!response.ok) {
    throw new Error(`Validation request failed: ${response.status}`);
  }
  return response.json();
}

/**
 * Lay the TEI out for reading (server-side, so the editor button and the
 * `format_image_text_tei` management command can never drift apart). Rejects
 * malformed markup rather than reflowing it.
 */
export async function formatTei(content: string): Promise<string> {
  const response = await proxyFetch('/api/v1/manuscripts/image-texts/format-tei/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  });
  if (!response.ok) {
    throw new Error(`Format request failed: ${response.status}`);
  }
  const data = (await response.json()) as { content: string };
  return data.content;
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
  const response = await proxyFetch(
    `/api/v1/manuscripts/management/image-texts/${textId}/link-region/`,
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
 * Track A — remove a SINGLE element↔region link: strip the region's `corresp`
 * reference from the element_index-th linkable element of *this* text only,
 * leaving the region Graph and its other links (e.g. the translation phrase)
 * intact. Returns the updated content.
 */
export async function unlinkElement(
  textId: number,
  elementIndex: number,
  graphId: number
): Promise<{ content: string }> {
  const response = await proxyFetch(
    `/api/v1/manuscripts/management/image-texts/${textId}/unlink-element/`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ element_index: elementIndex, graph_id: graphId }),
    }
  );
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Failed to unlink element: ${response.status}`);
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

export async function createImageText(payload: CreateImageTextPayload): Promise<ImageTextDetail> {
  const response = await proxyFetch(`/api/v1/manuscripts/management/image-texts/`, {
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
    const body = await response.json().catch(() => ({}));
    throw new BackofficeApiError(response.status, body as Record<string, unknown>);
  }
  return response.json();
}

export async function deleteImageText(textId: number): Promise<void> {
  const response = await proxyFetch(`/api/v1/manuscripts/management/image-texts/${textId}/`, {
    method: 'DELETE',
  });
  if (!response.ok && response.status !== 204) {
    const text = await response.text();
    throw new Error(text || `Failed to delete image text: ${response.status}`);
  }
}
