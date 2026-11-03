import { NextRequest, NextResponse } from 'next/server';
import { authFetch } from '@/lib/api-fetch';
import { authorizeSuperuser, getServerAuthToken } from '@/lib/auth-token-server';
import { crossOriginRefusal, isSameOriginRequest } from '@/lib/same-origin';

/** Backend management endpoints the `app/api/*` route handlers proxy to. */
export const MANAGEMENT_PAGES_PATH = '/api/v1/management/pages/';
export const MANAGEMENT_HEADINGS_PATH = '/api/v1/management/menu-headings/';

/** Relays a superuser's read of a management endpoint, status included. */
export async function readFromManagement(path: string): Promise<NextResponse> {
  const { token, refusal } = await authorizeSuperuser(await getServerAuthToken());
  if (refusal) return refusal;
  const res = await authFetch(path, token);
  return NextResponse.json(await res.json().catch(() => ({})), { status: res.status });
}

/**
 * Relays a superuser's write to a management endpoint, for the routes that
 * must revalidate cached pages after it (`proxyFetch` cannot). A cross-origin
 * write is refused before the token is read, and `revalidate` runs only once
 * the backend has accepted the write.
 */
export async function writeToManagement(
  request: NextRequest,
  path: string,
  revalidate: (saved: Record<string, unknown>) => void
): Promise<NextResponse> {
  if (!isSameOriginRequest(request)) return crossOriginRefusal();
  const { token, refusal } = await authorizeSuperuser(await getServerAuthToken());
  if (refusal) return refusal;

  const init: RequestInit = { method: request.method };
  if (request.method !== 'DELETE') {
    try {
      init.body = JSON.stringify(await request.json());
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    init.headers = { 'Content-Type': 'application/json' };
  }

  const res = await authFetch(path, token, init);
  if (res.status === 204) {
    revalidate({});
    return new NextResponse(null, { status: 204 });
  }
  const data = await res.json().catch(() => ({}));
  if (res.ok) revalidate(data);
  return NextResponse.json(data, { status: res.status });
}
