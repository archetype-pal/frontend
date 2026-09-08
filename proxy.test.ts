/** @vitest-environment node */
import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Re-imported per test (after `vi.resetModules`) so the module-scope config
// cache starts empty each time.
let proxy: typeof import('./proxy').proxy;

beforeEach(async () => {
  vi.resetModules();
  ({ proxy } = await import('./proxy'));
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('proxy section gating', () => {
  it('keeps a disabled section blocked once the config read starts failing', async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ sections: { lightbox: false }, searchCategories: {} }))
    );
    const first = await proxy(new NextRequest('http://localhost:3000/lightbox'));
    expect(first.headers.get('x-middleware-rewrite')).toContain('/not-found');

    vi.advanceTimersByTime(11_000);
    fetchMock.mockRejectedValueOnce(new Error('backend down'));
    const second = await proxy(new NextRequest('http://localhost:3000/lightbox'));
    expect(second.headers.get('x-middleware-rewrite')).toContain('/not-found');
  });

  it('still throttles config fetches to one per TTL while the backend is down', async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ sections: {}, searchCategories: {} }))
    );
    await proxy(new NextRequest('http://localhost:3000/'));

    vi.advanceTimersByTime(11_000);
    fetchMock.mockRejectedValue(new Error('backend down'));
    await proxy(new NextRequest('http://localhost:3000/'));
    await proxy(new NextRequest('http://localhost:3000/'));
    await proxy(new NextRequest('http://localhost:3000/'));

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe('proxy search category redirects', () => {
  it('redirects the search index to the first enabled category before rendering', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          sections: {},
          searchCategories: { manuscripts: { enabled: false }, images: { enabled: true } },
        })
      )
    );

    const response = await proxy(new NextRequest('http://localhost:3000/search?keyword=Kelso'));

    expect(response.headers.get('location')).toBe(
      'http://localhost:3000/search/images?keyword=Kelso'
    );
  });

  it('redirects a disabled search category to the first enabled category', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          sections: {},
          searchCategories: { manuscripts: { enabled: false }, images: { enabled: true } },
        })
      )
    );

    const response = await proxy(
      new NextRequest('http://localhost:3000/search/manuscripts?keyword=Kelso')
    );

    expect(response.headers.get('location')).toBe(
      'http://localhost:3000/search/images?keyword=Kelso'
    );
  });

  it('redirects an invalid search category to the first enabled category', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          sections: {},
          searchCategories: { manuscripts: { enabled: false }, images: { enabled: true } },
        })
      )
    );

    const response = await proxy(new NextRequest('http://localhost:3000/search/i?keyword=Kelso'));

    expect(response.headers.get('location')).toBe(
      'http://localhost:3000/search/images?keyword=Kelso'
    );
  });

  it('rewrites to not-found only when every configured category is disabled', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          sections: {},
          searchCategories: {
            manuscripts: { enabled: false },
            images: { enabled: false },
            scribes: { enabled: false },
            hands: { enabled: false },
            graphs: { enabled: false },
            texts: { enabled: false },
            clauses: { enabled: false },
            people: { enabled: false },
            places: { enabled: false },
          },
        })
      )
    );

    const response = await proxy(new NextRequest('http://localhost:3000/search/manuscripts'));

    expect(response.headers.get('x-middleware-rewrite')).toContain('/not-found');
  });
});
