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
