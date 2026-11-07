/**
 * "Letters like this": the glyphs whose vectors lie nearest one glyph's
 * (backend: `GET /api/v1/search/graphs/<id>/similar/`, AI programme W1.2).
 *
 * A glyph can be searched from only when its search document says
 * `has_glyph_vector`. The backend answers nearest first and scores each hit
 * `_rankingScore` = (1 + cosine) / 2, so 0.5 is an unrelated glyph.
 */

export const SIMILAR_GLYPHS_PAGE_SIZE = 24;

export type SimilarGlyphsOptions = {
  /** Leave out glyphs from this shelfmark: the letter-form in *other* charters. */
  excludeShelfmark?: string | null;
  /** Keep only glyphs of this character. */
  character?: string | null;
  offset?: number;
  limit?: number;
};

export function similarGlyphsHref(graphId: number | string): string {
  return `/search/graphs/${graphId}/similar`;
}

export function similarGlyphsApiPath(
  graphId: number | string,
  options: SimilarGlyphsOptions = {}
): string {
  const params = new URLSearchParams({
    limit: String(options.limit ?? SIMILAR_GLYPHS_PAGE_SIZE),
    offset: String(options.offset ?? 0),
  });
  if (options.excludeShelfmark) params.set('shelfmark__not', options.excludeShelfmark);
  if (options.character) params.set('character', options.character);
  return `/api/v1/search/graphs/${graphId}/similar/?${params.toString()}`;
}

/**
 * The cosine between the two glyphs' vectors as a whole percentage, from
 * Meilisearch's score: 100 is the same vector, 0 an unrelated one. Below 0
 * (a glyph pointing away) reads as 0.
 */
export function similarityPercent(rankingScore: number): number {
  return Math.max(0, Math.round((2 * rankingScore - 1) * 100));
}
