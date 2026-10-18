import { NextResponse } from 'next/server';
import { env } from '@/lib/env';

/**
 * CSRF guard for cookie-authenticated writes. `SameSite=Lax` stops cross-site
 * requests from carrying the cookie, but not same-site ones from a sibling
 * subdomain, so the browser must also vouch that the call came from this
 * origin. A request with neither header isn't from a browser, so it can't be
 * a forged one riding on a visitor's cookie.
 *
 * Browsers only send `Sec-Fetch-Site` to trustworthy origins (HTTPS or
 * localhost). Opening the dev server over plain HTTP from another address
 * (`http://192.168.x.x:3000`) leaves just `Origin`, which won't match
 * `NEXT_PUBLIC_SITE_URL`, so every write there gets a 403.
 */
export function isSameOriginRequest(request: Request): boolean {
  const fetchSite = request.headers.get('sec-fetch-site');
  if (fetchSite) return fetchSite === 'same-origin';
  const origin = request.headers.get('origin');
  return !origin || origin === new URL(env.siteUrl).origin;
}

export function crossOriginRefusal(): NextResponse {
  return NextResponse.json({ detail: 'Cross-origin request refused.' }, { status: 403 });
}
