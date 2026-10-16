import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/env', () => ({ env: { siteUrl: 'https://site.test' } }));
const { apiFetch, authFetch } = vi.hoisted(() => ({ apiFetch: vi.fn(), authFetch: vi.fn() }));
vi.mock('@/lib/api-fetch', () => ({ apiFetch, authFetch }));

import { NextRequest } from 'next/server';
import { POST } from './route';

const PROFILE = { id: 1, username: 'ed', is_staff: true, is_superuser: true };

function json(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: { 'content-type': 'application/json', ...init?.headers },
  });
}

function loginRequest(headers: Record<string, string> = {}) {
  return new NextRequest('https://site.test/api/auth/login', {
    method: 'POST',
    headers: { 'sec-fetch-site': 'same-origin', 'content-type': 'application/json', ...headers },
    body: JSON.stringify({ username: 'ed', password: 'pw' }),
  });
}

beforeEach(() => {
  apiFetch.mockReset();
  authFetch.mockReset();
});

describe('POST /api/auth/login', () => {
  it('keeps the token in an HttpOnly cookie and answers with the profile', async () => {
    apiFetch.mockResolvedValue(json({ auth_token: 'tok' }));
    authFetch.mockResolvedValue(json(PROFILE));

    const response = await POST(loginRequest());

    expect(await response.json()).toEqual({ user: PROFILE });
    const token = response.cookies.get('archetype_auth_token');
    expect(token).toMatchObject({ value: 'tok', httpOnly: true, secure: true, sameSite: 'lax' });
    const session = response.cookies.get('archetype_session');
    expect(session?.value).toMatch(/^[0-9a-f-]{36}$/);
    expect(session?.httpOnly).toBeFalsy();
  });

  it('forwards the client IP, which the login throttle keys on', async () => {
    apiFetch.mockResolvedValue(json({ auth_token: 'tok' }));
    authFetch.mockResolvedValue(json(PROFILE));

    await POST(loginRequest({ 'x-forwarded-for': '203.0.113.7' }));

    const headers = new Headers(apiFetch.mock.calls[0][1].headers);
    expect(headers.get('x-forwarded-for')).toBe('203.0.113.7');
  });

  it('passes a refusal through without setting a cookie', async () => {
    apiFetch.mockResolvedValue(
      json({ detail: 'Request was throttled.' }, { status: 429, headers: { 'retry-after': '42' } })
    );

    const response = await POST(loginRequest());

    expect(response.status).toBe(429);
    expect(response.headers.get('retry-after')).toBe('42');
    expect(response.cookies.get('archetype_auth_token')).toBeUndefined();
  });

  it('revokes the new token when the profile cannot be read', async () => {
    apiFetch.mockResolvedValue(json({ auth_token: 'tok' }));
    authFetch.mockResolvedValueOnce(json({}, { status: 500 })).mockResolvedValue(json({}));

    const response = await POST(loginRequest());

    expect(response.status).toBe(502);
    expect(authFetch).toHaveBeenCalledWith('/api/v1/auth/token/logout', 'tok', {
      method: 'POST',
    });
    expect(response.cookies.get('archetype_auth_token')).toBeUndefined();
  });

  it('refuses a cross-site sign-in', async () => {
    const response = await POST(loginRequest({ 'sec-fetch-site': 'cross-site' }));

    expect(response.status).toBe(403);
    expect(apiFetch).not.toHaveBeenCalled();
  });
});
