import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/env', () => ({
  env: { serverApiUrl: 'http://api.test', siteUrl: 'http://site.test' },
}));

const { getServerAuthToken } = vi.hoisted(() => ({ getServerAuthToken: vi.fn() }));
vi.mock('@/lib/auth-token-server', () => ({ getServerAuthToken }));

import { NextRequest } from 'next/server';
import { DELETE, GET, PATCH, POST } from './route';

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

  it('streams a body with the client Content-Length, so WSGI reads it without buffering', async () => {
    const request = new NextRequest('http://site.test/api/proxy/api/v1/x/7', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json', 'content-length': '7' },
      body: '{"a":1}',
    });

    await PATCH(request, params('api', 'v1', 'x', '7'));

    const init = fetchMock.mock.calls[0][1];
    expect(init.body).toBeInstanceOf(ReadableStream);
    expect(init.duplex).toBe('half');
    expect(new Headers(init.headers).get('content-length')).toBe('7');
    expect(await new Response(init.body).text()).toBe('{"a":1}');
  });

  it('buffers a body that came without a Content-Length, so fetch can compute one', async () => {
    const request = new NextRequest('http://site.test/api/proxy/api/v1/x/7', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: '{"a":1}',
    });

    await PATCH(request, params('api', 'v1', 'x', '7'));

    const init = fetchMock.mock.calls[0][1];
    expect(init.body).toBeInstanceOf(ArrayBuffer);
    expect(new TextDecoder().decode(init.body)).toBe('{"a":1}');
    expect(init).not.toHaveProperty('duplex');
  });

  it('sends no body for a body-less write such as DELETE', async () => {
    const request = new NextRequest('http://site.test/api/proxy/api/v1/x/7', { method: 'DELETE' });

    await DELETE(request, params('api', 'v1', 'x', '7'));

    expect(fetchMock.mock.calls[0][1].body).toBeUndefined();
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

  it('refuses an anonymous write without forwarding it', async () => {
    getServerAuthToken.mockResolvedValue(null);
    const request = new NextRequest('http://site.test/api/proxy/api/v1/x/7', {
      method: 'PATCH',
      body: '{"a":1}',
    });

    const response = await PATCH(request, params('api', 'v1', 'x', '7'));

    expect(response.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    ['a sibling subdomain', { 'sec-fetch-site': 'same-site', origin: 'http://evil.site.test' }],
    ['a foreign Origin from a browser without Sec-Fetch-Site', { origin: 'http://evil.test' }],
  ])('refuses a write from %s', async (_label, headers) => {
    const request = new NextRequest('http://site.test/api/proxy/api/v1/x', {
      method: 'POST',
      headers,
      body: '{}',
    });

    const response = await POST(request, params('api', 'v1', 'x'));

    expect(response.status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('accepts a same-origin write', async () => {
    const request = new NextRequest('http://site.test/api/proxy/api/v1/x', {
      method: 'POST',
      headers: { 'sec-fetch-site': 'same-origin', origin: 'http://site.test' },
      body: '{}',
    });

    const response = await POST(request, params('api', 'v1', 'x'));

    expect(response.status).toBe(200);
  });

  it('forwards the client IP and locale, and only those', async () => {
    const request = new NextRequest('http://site.test/api/proxy/api/v1/x', {
      headers: {
        'accept-language': 'fr',
        'x-forwarded-for': '203.0.113.7',
        'x-real-ip': '203.0.113.7',
        cookie: 'archetype_auth_token=tok',
      },
    });

    await GET(request, params('api', 'v1', 'x'));

    const sent = new Headers(fetchMock.mock.calls[0][1].headers);
    expect(sent.get('accept-language')).toBe('fr');
    expect(sent.get('x-forwarded-for')).toBe('203.0.113.7');
    expect(sent.get('x-real-ip')).toBe('203.0.113.7');
    expect(sent.has('cookie')).toBe(false);
  });

  it('passes useful response headers back to the browser', async () => {
    fetchMock.mockResolvedValue(
      new Response('a,b', {
        status: 200,
        headers: {
          'content-type': 'text/csv',
          'content-disposition': 'attachment; filename="texts.csv"',
          'retry-after': '30',
          etag: '"v1"',
          'set-cookie': 'sessionid=x',
        },
      })
    );

    const response = await GET(
      new NextRequest('http://site.test/api/proxy/api/v1/export'),
      params('api', 'v1', 'export')
    );

    expect(response.headers.get('content-disposition')).toBe('attachment; filename="texts.csv"');
    expect(response.headers.get('retry-after')).toBe('30');
    expect(response.headers.get('etag')).toBe('"v1"');
    expect(response.headers.has('set-cookie')).toBe(false);
  });
});
