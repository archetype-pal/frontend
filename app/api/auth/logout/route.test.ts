import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/env', () => ({ env: { siteUrl: 'http://site.test' } }));
const { authFetch, getServerAuthToken } = vi.hoisted(() => ({
  authFetch: vi.fn(),
  getServerAuthToken: vi.fn(),
}));
vi.mock('@/lib/api-fetch', () => ({ authFetch }));
vi.mock('@/lib/auth-token-server', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/auth-token-server')>()),
  getServerAuthToken,
}));

import { NextRequest } from 'next/server';
import { POST } from './route';

function logoutRequest(headers: Record<string, string> = { 'sec-fetch-site': 'same-origin' }) {
  return new NextRequest('http://site.test/api/auth/logout', { method: 'POST', headers });
}

function clearedNames(response: Response) {
  return response.headers
    .getSetCookie()
    .filter((c) => /Max-Age=0/i.test(c))
    .map((c) => c.split('=')[0]);
}

beforeEach(() => {
  authFetch.mockReset();
  getServerAuthToken.mockResolvedValue('tok');
});

describe('POST /api/auth/logout', () => {
  it('revokes the token and clears both cookies', async () => {
    authFetch.mockResolvedValue(new Response(null, { status: 204 }));

    const response = await POST(logoutRequest());

    expect(response.status).toBe(204);
    expect(authFetch).toHaveBeenCalledWith('/api/v1/auth/token/logout', 'tok', {
      method: 'POST',
    });
    expect(clearedNames(response).sort()).toEqual(['archetype_auth_token', 'archetype_session']);
  });

  it('still signs out when the revoke fails', async () => {
    authFetch.mockRejectedValue(new Error('down'));

    const response = await POST(logoutRequest());

    expect(response.status).toBe(204);
    expect(clearedNames(response)).toContain('archetype_auth_token');
  });

  it('refuses a cross-site sign-out', async () => {
    const response = await POST(logoutRequest({ origin: 'http://evil.test' }));

    expect(response.status).toBe(403);
    expect(authFetch).not.toHaveBeenCalled();
  });
});
