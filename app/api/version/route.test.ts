import { afterEach, describe, expect, it, vi } from 'vitest';

const { apiFetch } = vi.hoisted(() => ({ apiFetch: vi.fn() }));
vi.mock('@/lib/api-fetch', () => ({ apiFetch }));

import { GET } from './route';

afterEach(() => {
  vi.unstubAllEnvs();
  apiFetch.mockReset();
});

describe('GET /api/version', () => {
  it('reports the frontend build and the API build', async () => {
    vi.stubEnv('APP_VERSION', '2026.09.12.2205');
    vi.stubEnv('APP_COMMIT', 'abc123');
    apiFetch.mockResolvedValue(Response.json({ version: '2026.09.11.1000', commit: 'def456' }));

    const body = await (await GET()).json();

    expect(apiFetch).toHaveBeenCalledWith('/api/v1/version/', { cache: 'no-store' });
    expect(body).toEqual({
      frontend: { version: '2026.09.12.2205', commit: 'abc123' },
      api: { version: '2026.09.11.1000', commit: 'def456' },
    });
  });

  it('falls back to dev/unknown and a null API when nothing is stamped or reachable', async () => {
    vi.stubEnv('APP_VERSION', '');
    vi.stubEnv('APP_COMMIT', '');
    apiFetch.mockRejectedValue(new Error('ECONNREFUSED'));

    const body = await (await GET()).json();

    expect(body).toEqual({ frontend: { version: 'dev', commit: 'unknown' }, api: null });
  });

  it('reports a null API when the backend answers with an error', async () => {
    apiFetch.mockResolvedValue(new Response('', { status: 502 }));

    expect((await (await GET()).json()).api).toBeNull();
  });
});
