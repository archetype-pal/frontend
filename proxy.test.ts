/** @vitest-environment node */
import { NextRequest } from 'next/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { proxy } from './proxy';

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
});
