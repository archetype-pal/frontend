import { beforeEach, describe, expect, it, vi } from 'vitest';

const apiFetchMock = vi.fn();
vi.mock('@/lib/api-fetch', () => ({
  apiFetch: (...args: unknown[]) => apiFetchMock(...args),
}));

import { SimilarGlyphsError, getGlyph, getSimilarGlyphs } from './glyph-search';
import { jsonResponse } from '@/test/responses';

beforeEach(() => apiFetchMock.mockReset());

describe('getSimilarGlyphs', () => {
  it('asks the similar route with the filters and returns the page', async () => {
    const page = { results: [{ id: 8, _rankingScore: 0.9 }], total: 1, limit: 24, offset: 0 };
    apiFetchMock.mockResolvedValue(jsonResponse(page));

    await expect(getSimilarGlyphs(95, { excludeShelfmark: 'GD55/296' })).resolves.toEqual(page);
    expect(apiFetchMock.mock.calls[0]![0]).toBe(
      '/api/v1/search/graphs/95/similar/?limit=24&offset=0&shelfmark__not=GD55%2F296'
    );
  });

  it.each([
    [404, 'no-vector'],
    [503, 'unavailable'],
    [500, 'failed'],
  ])('a %s says why: %s', async (status, reason) => {
    apiFetchMock.mockResolvedValue(jsonResponse({ detail: 'x' }, status));

    const error = await getSimilarGlyphs(95).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(SimilarGlyphsError);
    expect((error as SimilarGlyphsError).reason).toBe(reason);
  });
});

describe('getGlyph', () => {
  it('reads the glyph search document', async () => {
    apiFetchMock.mockResolvedValue(jsonResponse({ id: 95, has_glyph_vector: true }));

    await expect(getGlyph(95)).resolves.toEqual({ id: 95, has_glyph_vector: true });
    expect(apiFetchMock.mock.calls[0]![0]).toBe('/api/v1/search/graphs/95/');
  });

  it('a missing glyph is one with nothing to search from', async () => {
    apiFetchMock.mockResolvedValue(jsonResponse({ detail: 'Not found.' }, 404));

    await expect(getGlyph(95)).rejects.toMatchObject({ reason: 'no-vector' });
  });
});
