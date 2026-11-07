/**
 * Asking a model about one shape, from the viewer (AI programme W3.5, W3.6).
 * Through the proxy: these are the signed-in user's own requests.
 */

import { proxyFetch } from '@/lib/api-fetch';
import type { AnnotationExplanationData, ShapeSuggestion } from '@/types/glyph-assist';

const JSON_HEADERS = { 'Content-Type': 'application/json' };

/** Why the model could not answer; `detail` is worded for the user, and empty if it was never reached. */
export class GlyphAssistError extends Error {
  constructor(
    readonly status: number,
    readonly detail: string
  ) {
    super(detail || `The model's route answered ${status}`);
    this.name = 'GlyphAssistError';
  }
}

async function post<T>(path: string, body: unknown): Promise<T> {
  let response: Response;
  try {
    response = await proxyFetch(path, {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify(body),
    });
  } catch {
    throw new GlyphAssistError(0, '');
  }
  if (!response.ok) {
    const reply: unknown = await response.json().catch(() => null);
    const detail =
      reply && typeof reply === 'object' && 'detail' in reply && typeof reply.detail === 'string'
        ? reply.detail
        : '';
    throw new GlyphAssistError(response.status, detail);
  }
  return response.json() as Promise<T>;
}

export async function getAssistEnabled(): Promise<boolean> {
  const response = await proxyFetch('/api/v1/vision/assist/', { cache: 'no-store' });
  if (!response.ok) return false;
  const body = (await response.json()) as { enabled?: boolean };
  return Boolean(body.enabled);
}

export function suggestShape(
  imageId: number,
  body: { annotation: unknown; allograph?: number | null; language: string }
): Promise<ShapeSuggestion> {
  return post(`/api/v1/vision/pages/${imageId}/suggest/`, body);
}

export function rejectSuggestion(id: number): Promise<{ status: string }> {
  return post(`/api/v1/vision/suggestions/${id}/reject/`, {});
}

export function explainAnnotation(
  graphId: number,
  language: string
): Promise<AnnotationExplanationData> {
  return post(`/api/v1/vision/graphs/${graphId}/explain/`, { language });
}
