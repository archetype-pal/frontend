import { describe, expect, it } from 'vitest';

import {
  SIMILAR_GLYPHS_PAGE_SIZE,
  similarGlyphsApiPath,
  similarGlyphsHref,
  similarityPercent,
} from './similar-glyphs';

describe('similarGlyphsApiPath', () => {
  it('asks for the first page and nothing else by default', () => {
    expect(similarGlyphsApiPath(95)).toBe(
      `/api/v1/search/graphs/95/similar/?limit=${SIMILAR_GLYPHS_PAGE_SIZE}&offset=0`
    );
  });

  it('leaves out a shelfmark and keeps one character, encoded', () => {
    expect(
      similarGlyphsApiPath(95, { excludeShelfmark: 'GD55/296', character: 'A', offset: 24 })
    ).toBe(
      '/api/v1/search/graphs/95/similar/?limit=24&offset=24&shelfmark__not=GD55%2F296&character=A'
    );
  });

  it('sends no filter for an empty or missing value', () => {
    expect(similarGlyphsApiPath(95, { excludeShelfmark: '', character: null })).not.toMatch(
      /shelfmark__not|character/
    );
  });
});

describe('similarGlyphsHref', () => {
  it('mirrors the API route under the glyph search', () => {
    expect(similarGlyphsHref(95)).toBe('/search/graphs/95/similar');
  });
});

describe('similarityPercent', () => {
  it.each([
    [1, 100],
    [0.95, 90],
    [0.5, 0],
    [0.2, 0],
  ])('reads Meilisearch score %s as %s%% (the cosine)', (score, percent) => {
    expect(similarityPercent(score)).toBe(percent);
  });
});
