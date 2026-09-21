import { cookies } from 'next/headers';
import { AUTH_TOKEN_COOKIE } from '@/lib/auth-token-cookie';

/**
 * Server-only counterpart to `getAuthTokenCookie` — reads the auth cookie via
 * `next/headers` instead of `document.cookie`, so it keeps working once the
 * cookie becomes `HttpOnly` (browser JS can no longer read it, but the Next
 * server still receives it on every request). Route handlers and server
 * components should read the caller's identity this way instead of trusting
 * a client-supplied `Authorization` header, which a browser can no longer
 * set for itself once it can't read the token.
 */
export async function getServerAuthToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(AUTH_TOKEN_COOKIE)?.value ?? null;
}
