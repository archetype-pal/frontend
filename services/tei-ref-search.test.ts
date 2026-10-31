import { beforeEach, describe, expect, it, vi } from 'vitest';

const apiFetchMock = vi.fn();
vi.mock('@/lib/api-fetch', () => ({
  apiFetch: (...args: unknown[]) => apiFetchMock(...args),
}));

import { searchItemParts, searchPlaces, searchScribes } from './tei-ref-search';
import { jsonResponse } from '@/test/json-response';

/**
 * Pins the public search-endpoint contract the `<ref>` picker depends on:
 * `GET /api/v1/search/{segment}/?q=&limit=` returning `{ results: [...] }`
 * (`apps/search/views_search.py` + `apps/search/parsers.py` on the backend).
 * The picker is the only network-touching part of the feature, and a change to
 * the param name or the envelope would otherwise surface as "no results".
 */

beforeEach(() => {
  apiFetchMock.mockReset();
});

describe('tei-ref-search endpoints', () => {
  it('queries the scribes index with q + limit and returns the results array', async () => {
    apiFetchMock.mockResolvedValue(
      jsonResponse({ results: [{ id: 42, name: 'A. Scribe' }], total: 1 }, 200)
    );
    const hits = await searchScribes('john');
    expect(apiFetchMock).toHaveBeenCalledTimes(1);
    expect(apiFetchMock.mock.calls[0][0]).toBe('/api/v1/search/scribes/?q=john&limit=12');
    expect(hits).toEqual([{ id: 42, name: 'A. Scribe' }]);
  });

  it('uses the item-parts and places segments with their own default limits', async () => {
    // A Response body can only be read once, so hand out a fresh one per call.
    apiFetchMock.mockImplementation(() => Promise.resolve(jsonResponse({ results: [] }, 200)));
    await searchItemParts('kelso');
    expect(apiFetchMock.mock.calls[0][0]).toBe('/api/v1/search/item-parts/?q=kelso&limit=12');
    await searchPlaces('kelso');
    expect(apiFetchMock.mock.calls[1][0]).toBe('/api/v1/search/places/?q=kelso&limit=20');
  });

  it('honours an explicit limit and forwards the abort signal', async () => {
    apiFetchMock.mockResolvedValue(jsonResponse({ results: [] }, 200));
    const controller = new AbortController();
    await searchScribes('a', 3, controller.signal);
    expect(apiFetchMock.mock.calls[0][0]).toBe('/api/v1/search/scribes/?q=a&limit=3');
    expect(apiFetchMock.mock.calls[0][1]).toEqual({ signal: controller.signal });
  });

  it('percent-encodes the query', async () => {
    apiFetchMock.mockResolvedValue(jsonResponse({ results: [] }, 200));
    await searchPlaces("St Andrew's & co");
    expect(apiFetchMock.mock.calls[0][0]).toBe(
      '/api/v1/search/places/?q=St+Andrew%27s+%26+co&limit=20'
    );
  });

  it('yields [] when the envelope has no usable results array', async () => {
    apiFetchMock.mockImplementation(() => Promise.resolve(jsonResponse({ total: 0 }, 200)));
    await expect(searchScribes('a')).resolves.toEqual([]);
    apiFetchMock.mockImplementation(() => Promise.resolve(jsonResponse({ results: 'nope' }, 200)));
    await expect(searchScribes('a')).resolves.toEqual([]);
  });

  it('throws on a non-2xx response rather than silently returning []', async () => {
    apiFetchMock.mockResolvedValue(jsonResponse({ detail: 'search unavailable' }, 503));
    await expect(searchScribes('a')).rejects.toThrow(/503/);
  });
});
