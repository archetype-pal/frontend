import { apiFetch } from '@/lib/api-fetch';
import { similarGlyphsApiPath, type SimilarGlyphsOptions } from '@/lib/similar-glyphs';
import type { GraphListItem } from '@/types/search';

export type SimilarGlyphsPage = {
  results: GraphListItem[];
  total: number;
  limit: number;
  offset: number;
};

/**
 * Why "letters like this" could not answer: `no-vector` (404: the glyph, or
 * its vector, is missing), `unavailable` (503: the index has not taken its
 * embedder yet) or `failed` (anything else).
 */
export class SimilarGlyphsError extends Error {
  constructor(readonly reason: 'no-vector' | 'unavailable' | 'failed') {
    super(`Letters like this: ${reason}`);
  }
}

/** One glyph's search document, as the glyph search shows it. */
export async function getGlyph(graphId: number): Promise<GraphListItem> {
  const response = await apiFetch(`/api/v1/search/graphs/${graphId}/`, { cache: 'no-store' });
  if (response.status === 404) throw new SimilarGlyphsError('no-vector');
  if (!response.ok) throw new SimilarGlyphsError('failed');
  return response.json();
}

/** The glyphs nearest this one, nearest first, each with its `_rankingScore`. */
export async function getSimilarGlyphs(
  graphId: number,
  options: SimilarGlyphsOptions = {}
): Promise<SimilarGlyphsPage> {
  const response = await apiFetch(similarGlyphsApiPath(graphId, options), { cache: 'no-store' });
  if (response.status === 404) throw new SimilarGlyphsError('no-vector');
  if (response.status === 503) throw new SimilarGlyphsError('unavailable');
  if (!response.ok) throw new SimilarGlyphsError('failed');
  return response.json();
}
