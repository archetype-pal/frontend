import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/env', () => ({ env: { serverApiUrl: 'http://api.test' } }));

const { getServerAuthToken } = vi.hoisted(() => ({ getServerAuthToken: vi.fn() }));
vi.mock('@/lib/auth-token-server', () => ({ getServerAuthToken }));

import { NextRequest } from 'next/server';
import { GET, PATCH } from './route';

const fetchMock = vi.fn();

function params(...path: string[]) {
  return { params: Promise.resolve({ path }) };
}

beforeEach(() => {
  getServerAuthToken.mockResolvedValue('tok');
  fetchMock.mockReset();
  fetchMock.mockResolvedValue(
    new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } })
  );
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('/api/proxy', () => {
  it('restores the trailing slash Next strips, so Django does not APPEND_SLASH-redirect', async () => {
    // What the handler actually receives for `/api/proxy/api/v1/x/7/` after
    // Next's trailing-slash 308: the segments, with no slash left.
    const request = new NextRequest('http://site.test/api/proxy/api/v1/x/7', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: '{"a":1}',
    });

    await PATCH(request, params('api', 'v1', 'x', '7'));

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://api.test/api/v1/x/7/');
    expect(init.method).toBe('PATCH');
    expect(new Headers(init.headers).get('Authorization')).toBe('Token tok');
  });

  it('keeps the query string after the restored slash', async () => {
    const request = new NextRequest('http://site.test/api/proxy/api/v1/export?format=csv&a=1');

    await GET(request, params('api', 'v1', 'export'));

    expect(fetchMock.mock.calls[0][0]).toBe('http://api.test/api/v1/export/?format=csv&a=1');
  });

  it('forwards without Authorization when there is no auth cookie', async () => {
    getServerAuthToken.mockResolvedValue(null);
    const request = new NextRequest('http://site.test/api/proxy/api/v1/x');

    await GET(request, params('api', 'v1', 'x'));

    expect(new Headers(fetchMock.mock.calls[0][1].headers).has('Authorization')).toBe(false);
  });
});
