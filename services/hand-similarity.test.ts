import { beforeEach, describe, expect, it, vi } from 'vitest';

const apiFetchMock = vi.fn();
vi.mock('@/lib/api-fetch', () => ({
  apiFetch: (...args: unknown[]) => apiFetchMock(...args),
}));

import { formsCompared, getSimilarHands } from './hand-similarity';
import { jsonResponse } from '@/test/responses';

beforeEach(() => apiFetchMock.mockReset());

describe('getSimilarHands', () => {
  it('reads the hand’s nearest hands', async () => {
    const body = {
      hand: 40,
      glyphs: 24,
      minimum_glyphs: 10,
      vectors: 'hog@1',
      computed: null,
      results: [],
    };
    apiFetchMock.mockResolvedValue(jsonResponse(body));

    await expect(getSimilarHands(40)).resolves.toEqual(body);
    expect(apiFetchMock).toHaveBeenCalledWith('/api/v1/hands/40/similar/');
  });

  it('gives null for a refusal, so the page goes on without the tab', async () => {
    apiFetchMock.mockResolvedValue(jsonResponse({ detail: 'x' }, 404));

    await expect(getSimilarHands(40)).resolves.toBeNull();
  });

  it('gives null for an outage too', async () => {
    apiFetchMock.mockRejectedValueOnce(new TypeError('fetch failed'));

    await expect(getSimilarHands(40)).resolves.toBeNull();
  });
});

describe('formsCompared', () => {
  it('counts, per shared letter, the fewer of the two hands’ forms', () => {
    const letter = (glyphs: [number, number]) => ({
      allograph: 1,
      name: 'a',
      character: 'a',
      similarity: 0.5,
      glyphs,
    });

    expect(formsCompared([letter([4, 2]), letter([1, 6]), letter([3, 3])])).toBe(6);
    expect(formsCompared([])).toBe(0);
  });
});
