import { NextRequest, NextResponse } from 'next/server';
import { authFetch } from '@/lib/api-fetch';
import { AUTH_SESSION_COOKIE } from '@/lib/auth-token-cookie';
import { clearAuthCookies, getServerAuthToken, setAuthCookies } from '@/lib/auth-token-server';

/**
 * Who is signed in, or `{ user: null }`. Anonymous is a 200, not a 401: every
 * visitor's first page load asks, and a guest is not an error.
 */
export async function GET(request: NextRequest) {
  const token = await getServerAuthToken();
  if (!token) {
    const response = NextResponse.json({ user: null });
    if (request.cookies.has(AUTH_SESSION_COOKIE)) clearAuthCookies(response, request);
    return response;
  }

  let profile: Response;
  try {
    profile = await authFetch('/api/v1/auth/profile', token);
  } catch {
    return NextResponse.json({ detail: 'Profile unavailable.' }, { status: 502 });
  }
  if (profile.status === 401 || profile.status === 403) {
    const response = NextResponse.json({ user: null });
    clearAuthCookies(response, request);
    return response;
  }
  // Keep the cookies on an outage: the token is probably still good.
  if (!profile.ok) {
    return NextResponse.json({ detail: 'Profile unavailable.' }, { status: 502 });
  }

  const response = NextResponse.json({ user: await profile.json() });
  // Re-issuing on every check upgrades a pre-HttpOnly cookie and slides the
  // expiry. A legacy session has no session id yet, so it gets one here.
  const sessionId = request.cookies.get(AUTH_SESSION_COOKIE)?.value ?? crypto.randomUUID();
  setAuthCookies(response, request, token, sessionId);
  return response;
}
