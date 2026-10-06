import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/** `isDev` is read once at module scope, so each case needs a fresh import. */
async function importApiFetch(nodeEnv: string) {
  vi.stubEnv('NODE_ENV', nodeEnv);
  vi.resetModules();
  return (await import('./api-fetch')).apiFetch;
}

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('apiFetch logging', () => {
  it('reports a non-2xx as an error in development, not as a successful request', async () => {
    const apiFetch = await importApiFetch('development');
    vi.stubGlobal('fetch', async () => new Response('', { status: 500 }));

    await apiFetch('/api/v1/site-labels/');

    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('→ 500'));
    expect(console.log).not.toHaveBeenCalled();
  });

  it('stays quiet when the caller aborts the request', async () => {
    const apiFetch = await importApiFetch('production');
    vi.stubGlobal('fetch', async () => {
      throw new DOMException('aborted', 'AbortError');
    });

    await expect(apiFetch('/api/v1/search/')).rejects.toThrow();

    expect(console.error).not.toHaveBeenCalled();
  });
});

describe('proxyFetch', () => {
  it('drops the trailing slash so Next does not 308 the request', async () => {
    const { proxyFetch } = await import('./api-fetch');
    const fetchMock = vi.fn(async (_url: string) => new Response('{}'));
    vi.stubGlobal('fetch', fetchMock);

    await proxyFetch('/api/v1/x/7/');
    await proxyFetch('/api/v1/x/?page=2');

    expect(fetchMock.mock.calls.map((c) => c[0])).toEqual([
      '/api/proxy/api/v1/x/7',
      '/api/proxy/api/v1/x?page=2',
    ]);
  });
});

describe('optionalAuthFetch', () => {
  it('proxies a signed-in browser call and sends an anonymous one straight to Django', async () => {
    const { optionalAuthFetch, API_BASE_URL } = await import('./api-fetch');
    const fetchMock = vi.fn(async (_url: string) => new Response('[]'));
    vi.stubGlobal('fetch', fetchMock);

    await optionalAuthFetch('/api/v1/manuscripts/graphs/?item_image=1', true);
    await optionalAuthFetch('/api/v1/manuscripts/graphs/?item_image=1', false);

    expect(fetchMock.mock.calls.map((c) => c[0])).toEqual([
      '/api/proxy/api/v1/manuscripts/graphs?item_image=1',
      `${API_BASE_URL}/api/v1/manuscripts/graphs/?item_image=1`,
    ]);
  });
});
