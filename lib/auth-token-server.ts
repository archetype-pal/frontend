import { cookies } from 'next/headers';
import type { NextRequest, NextResponse } from 'next/server';
import {
  AUTH_COOKIE_MAX_AGE_SECONDS,
  AUTH_SESSION_COOKIE,
  AUTH_TOKEN_COOKIE,
} from '@/lib/auth-token-cookie';

/**
 * The caller's token, read from the HttpOnly cookie. Route handlers and server
 * components resolve identity this way; browser code can't read the token, so
 * it never sends an `Authorization` header of its own.
 */
export async function getServerAuthToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(AUTH_TOKEN_COOKIE)?.value ?? null;
}

function isHttps(request: NextRequest): boolean {
  // Behind nginx the hop to Next is plain http; the visitor's scheme is here.
  const forwarded = request.headers.get('x-forwarded-proto')?.split(',')[0].trim();
  return (forwarded ?? request.nextUrl.protocol.replace(':', '')) === 'https';
}

/**
 * Also re-issues a cookie written before the HttpOnly switch, by `document.cookie`:
 * same name and path, so this Set-Cookie replaces it, attributes included.
 */
export function setAuthCookies(
  response: NextResponse,
  request: NextRequest,
  token: string,
  sessionId: string
): void {
  const base = {
    path: '/',
    sameSite: 'lax',
    secure: isHttps(request),
    maxAge: AUTH_COOKIE_MAX_AGE_SECONDS,
  } as const;
  response.cookies.set(AUTH_TOKEN_COOKIE, token, { ...base, httpOnly: true });
  response.cookies.set(AUTH_SESSION_COOKIE, sessionId, base);
}

export function clearAuthCookies(response: NextResponse, request: NextRequest): void {
  for (const name of [AUTH_TOKEN_COOKIE, AUTH_SESSION_COOKIE]) {
    response.cookies.set(name, '', {
      path: '/',
      sameSite: 'lax',
      secure: isHttps(request),
      maxAge: 0,
    });
  }
}
