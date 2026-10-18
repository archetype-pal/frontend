import { NextRequest, NextResponse } from 'next/server';
import { apiFetch, authFetch } from '@/lib/api-fetch';
import { setAuthCookies } from '@/lib/auth-token-server';
import { CLIENT_REQUEST_HEADERS, pickHeaders } from '@/lib/forwarded-headers';
import { crossOriginRefusal, isSameOriginRequest } from '@/lib/same-origin';

/**
 * Signs in against Django and keeps the token server-side, in an HttpOnly
 * cookie the browser can't read. Answers with the profile, so the client
 * needs no second round trip to learn who signed in.
 */
export async function POST(request: NextRequest) {
  // Login CSRF: a forged sign-in would put the visitor in someone else's account.
  if (!isSameOriginRequest(request)) return crossOriginRefusal();

  const credentials = await request.json().catch(() => null);
  if (typeof credentials?.username !== 'string' || typeof credentials?.password !== 'string') {
    return NextResponse.json({ detail: 'Username and password are required.' }, { status: 400 });
  }

  // The client IP must reach Django: LoginThrottle keys on it, and from this
  // container every visitor would otherwise share one bucket.
  const headers = pickHeaders(request.headers, CLIENT_REQUEST_HEADERS);
  headers.set('content-type', 'application/json');
  let login: Response;
  try {
    login = await apiFetch('/api/v1/auth/token/login', {
      method: 'POST',
      headers,
      body: JSON.stringify({ username: credentials.username, password: credentials.password }),
    });
  } catch {
    return NextResponse.json({ detail: 'Sign-in is unavailable.' }, { status: 502 });
  }
  if (!login.ok) {
    const retryAfter = login.headers.get('retry-after');
    return NextResponse.json(await login.json().catch(() => ({})), {
      status: login.status,
      headers: retryAfter ? { 'retry-after': retryAfter } : undefined,
    });
  }

  const { auth_token: token } = (await login.json()) as { auth_token: string };
  const profile = await authFetch('/api/v1/auth/profile', token).catch(() => null);
  if (!profile?.ok) {
    // Don't leave a live token behind that no cookie will ever carry.
    void authFetch('/api/v1/auth/token/logout', token, { method: 'POST' }).catch(() => {});
    return NextResponse.json({ detail: 'Sign-in is unavailable.' }, { status: 502 });
  }

  const response = NextResponse.json({ user: await profile.json() });
  setAuthCookies(response, request, token, crypto.randomUUID());
  return response;
}
