import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

const { authFetch } = vi.hoisted(() => ({ authFetch: vi.fn() }));
vi.mock('@/lib/api-fetch', () => ({ authFetch }));

const { getServerAuthToken } = vi.hoisted(() => ({ getServerAuthToken: vi.fn() }));
vi.mock('@/lib/auth-token-server', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/auth-token-server')>()),
  getServerAuthToken,
}));

import { NextRequest } from 'next/server';
import { POST } from './route';
import { DELETE, PATCH } from './[slug]/route';

beforeEach(() => {
  authFetch.mockReset();
  getServerAuthToken.mockReset();
  getServerAuthToken.mockResolvedValue('su-token');
});

const params = { params: Promise.resolve({ slug: 'about' }) };

function crossSite(method: string): NextRequest {
  return new NextRequest('http://site.test/api/pages/about', {
    method,
    headers: { 'sec-fetch-site': 'cross-site' },
    body: method === 'DELETE' ? undefined : '{}',
  });
}

describe('page writes from another origin', () => {
  it.each([
    ['POST /api/pages', () => POST(crossSite('POST'))],
    ['PATCH /api/pages/[slug]', () => PATCH(crossSite('PATCH'), params)],
    ['DELETE /api/pages/[slug]', () => DELETE(crossSite('DELETE'), params)],
  ])('%s is refused without reading the token or calling the backend', async (_label, call) => {
    const response = await call();

    expect(response.status).toBe(403);
    expect(getServerAuthToken).not.toHaveBeenCalled();
    expect(authFetch).not.toHaveBeenCalled();
  });
});
