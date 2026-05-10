import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { walkPaginated } from './walk-paginated';

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

const fetcher = vi.fn();

beforeEach(() => {
  fetcher.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('walkPaginated', () => {
  it('returns the first-page results when no `next` URL is present', async () => {
    fetcher.mockResolvedValueOnce(
      jsonResponse({ count: 2, next: null, previous: null, results: [{ id: 1 }, { id: 2 }] })
    );
    const result = await walkPaginated<{ id: number }>('/items/?limit=100', fetcher);
    expect(result.map((r) => r.id)).toEqual([1, 2]);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('walks `next` until exhausted and merges all pages in order', async () => {
    fetcher.mockResolvedValueOnce(
      jsonResponse({
        count: 4,
        next: 'http://api.example.com/items/?limit=100&offset=100',
        previous: null,
        results: [{ id: 1 }, { id: 2 }],
      })
    );
    fetcher.mockResolvedValueOnce(
      jsonResponse({ count: 4, next: null, previous: null, results: [{ id: 3 }, { id: 4 }] })
    );
    const result = await walkPaginated<{ id: number }>('/items/?limit=100', fetcher);
    expect(result.map((r) => r.id)).toEqual([1, 2, 3, 4]);
    // The follow-up call MUST receive a relative path — feeding the absolute
    // URL back into the fetcher would double-prepend the API base.
    const secondPath = fetcher.mock.calls[1]![0] as string;
    expect(secondPath.startsWith('/items/')).toBe(true);
    expect(secondPath.includes('http://')).toBe(false);
  });

  it('returns the partial buffer on a non-OK response without throwing', async () => {
    fetcher.mockResolvedValueOnce(
      jsonResponse({
        count: 4,
        next: 'http://api.example.com/items/?limit=100&offset=100',
        previous: null,
        results: [{ id: 1 }],
      })
    );
    fetcher.mockResolvedValueOnce(jsonResponse({ detail: 'forbidden' }, 403));
    const result = await walkPaginated<{ id: number }>('/items/?limit=100', fetcher);
    // First page collected; second page short-circuits on 403.
    expect(result.map((r) => r.id)).toEqual([1]);
  });

  it('handles a bare-array response (legacy / pagination disabled)', async () => {
    fetcher.mockResolvedValueOnce(jsonResponse([{ id: 1 }, { id: 2 }]));
    const result = await walkPaginated<{ id: number }>('/items/?limit=100', fetcher);
    expect(result.map((r) => r.id)).toEqual([1, 2]);
  });

  it('treats a relative `next` as already a path (no host to strip)', async () => {
    fetcher.mockResolvedValueOnce(
      jsonResponse({
        count: 2,
        next: '/items/?limit=100&offset=100',
        previous: null,
        results: [{ id: 1 }],
      })
    );
    fetcher.mockResolvedValueOnce(
      jsonResponse({ count: 2, next: null, previous: null, results: [{ id: 2 }] })
    );
    await walkPaginated<{ id: number }>('/items/?limit=100', fetcher);
    expect(fetcher.mock.calls[1]![0]).toBe('/items/?limit=100&offset=100');
  });

  it('does NOT throw on a `null` or scalar response body — returns the partial buffer', async () => {
    // A misconfigured endpoint or upstream that emits literal `null`,
    // `42`, etc. used to crash on `.results` access. Treat as
    // end-of-stream and return what we collected up to that point.
    fetcher.mockResolvedValueOnce(
      jsonResponse({
        count: 1,
        next: 'http://api.example.com/items/?offset=100',
        previous: null,
        results: [{ id: 1 }],
      })
    );
    fetcher.mockResolvedValueOnce(jsonResponse(null));
    const result = await walkPaginated<{ id: number }>('/items/?limit=100', fetcher);
    expect(result.map((r) => r.id)).toEqual([1]);
  });

  it('handles a paginated dict whose `results` field is missing or non-array', async () => {
    // Upstream shape drift — `{count: 0, next: null}` without a `results`
    // key. The previous spread would fall through `(data.results ?? [])`
    // which is fine for missing, but the type cast would lie if results
    // was a non-array.
    fetcher.mockResolvedValueOnce(jsonResponse({ count: 0, next: null, previous: null }));
    const result = await walkPaginated<{ id: number }>('/items/?limit=100', fetcher);
    expect(result).toEqual([]);
  });
});
