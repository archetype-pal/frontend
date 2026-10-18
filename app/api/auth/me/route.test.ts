import { beforeEach, describe, expect, it, vi } from 'vitest';

const { authFetch, cookieJar } = vi.hoisted(() => ({
  authFetch: vi.fn(),
  cookieJar: new Map<string, string>(),
}));
vi.mock('@/lib/api-fetch', () => ({ authFetch }));
vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) => (cookieJar.has(name) ? { value: cookieJar.get(name) } : undefined),
  }),
}));

import { NextRequest } from 'next/server';
import { GET } from './route';

const PROFILE = { id: 1, username: 'ed', is_staff: true, is_superuser: false };

function meRequest() {
  const cookie = [...cookieJar].map(([k, v]) => `${k}=${v}`).join('; ');
  return new NextRequest('http://site.test/api/auth/me', { headers: cookie ? { cookie } : {} });
}

function cleared(response: Response, name: string) {
  return response.headers.getSetCookie().some((c) => c.startsWith(`${name}=;`));
}

beforeEach(() => {
  authFetch.mockReset();
  cookieJar.clear();
});

describe('GET /api/auth/me', () => {
  it('answers a guest with a null user, without calling Django', async () => {
    const response = await GET(meRequest());

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ user: null });
    expect(authFetch).not.toHaveBeenCalled();
  });

  it('re-issues a cookie written by document.cookie as HttpOnly, minting a session id', async () => {
    cookieJar.set('archetype_auth_token', 'tok');
    authFetch.mockResolvedValue(new Response(JSON.stringify(PROFILE)));

    const response = await GET(meRequest());

    expect(await response.json()).toEqual({ user: PROFILE });
    expect(response.cookies.get('archetype_auth_token')).toMatchObject({
      value: 'tok',
      httpOnly: true,
    });
    expect(response.cookies.get('archetype_session')?.value).toBeTruthy();
  });

  it('keeps the session id it already has, so the upload queue keeps running', async () => {
    cookieJar.set('archetype_auth_token', 'tok');
    cookieJar.set('archetype_session', 's1');
    authFetch.mockResolvedValue(new Response(JSON.stringify(PROFILE)));

    const response = await GET(meRequest());

    expect(response.cookies.get('archetype_session')?.value).toBe('s1');
  });

  it('signs out a revoked token', async () => {
    cookieJar.set('archetype_auth_token', 'dead');
    cookieJar.set('archetype_session', 's1');
    authFetch.mockResolvedValue(new Response('{}', { status: 401 }));

    const response = await GET(meRequest());

    expect(await response.json()).toEqual({ user: null });
    expect(cleared(response, 'archetype_auth_token')).toBe(true);
    expect(cleared(response, 'archetype_session')).toBe(true);
  });

  it('keeps the cookies through a backend outage', async () => {
    cookieJar.set('archetype_auth_token', 'tok');
    authFetch.mockResolvedValue(new Response('', { status: 503 }));

    const response = await GET(meRequest());

    expect(response.status).toBe(502);
    expect(response.headers.getSetCookie()).toEqual([]);
  });
});
