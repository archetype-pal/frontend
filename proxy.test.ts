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
