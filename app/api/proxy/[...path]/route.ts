import { NextRequest, NextResponse } from 'next/server';
import { env } from '@/lib/env';
import { getServerAuthToken } from '@/lib/auth-token-server';
import { CLIENT_REQUEST_HEADERS, pickHeaders } from '@/lib/forwarded-headers';
import { crossOriginRefusal, isSameOriginRequest } from '@/lib/same-origin';

/**
 * Same-origin passthrough to the Django API, for browser code that must not
 * hold the raw auth token itself (see `proxyFetch` in `lib/api-fetch.ts`).
 * The browser sends its auth cookie here automatically (same-origin, cookie
 * doesn't need to be JS-readable for that); this handler reads it server-side
 * and attaches the `Authorization` header the backend expects. Server-side
 * code that already resolved a token (via `getServerAuthToken`) should call
 * the backend directly with `authFetch` instead — going through this route
 * from the server would just add a redundant hop.
 */

type RouteParams = { params: Promise<{ path: string[] }> };

const FORWARDED_REQUEST_HEADERS = ['content-type', ...CLIENT_REQUEST_HEADERS];
const FORWARDED_RESPONSE_HEADERS = [
  'content-type',
  'content-disposition',
  'location',
  'retry-after',
  'etag',
] as const;

async function handle(request: NextRequest, { params }: RouteParams) {
  const { path } = await params;
  const token = await getServerAuthToken();

  // Callers drop the trailing slash (see `proxyFetch`) so Next doesn't 308 them,
  // but every route proxied here ends in one (`DefaultRouter`). Forwarding
  // without it makes Django answer with an APPEND_SLASH 301 — so restore it.
  const targetUrl = `${env.serverApiUrl}/${path.join('/')}/${request.nextUrl.search}`;

  const headers = pickHeaders(request.headers, FORWARDED_REQUEST_HEADERS);
  if (token) headers.set('Authorization', `Token ${token}`);

  const hasBody = request.method !== 'GET' && request.method !== 'HEAD';
  if (hasBody && !isSameOriginRequest(request)) return crossOriginRefusal();
  // Refuse an anonymous write before reading it, so a client without a cookie
  // can't make this server take in an upload-sized body.
  if (hasBody && !token) {
    return NextResponse.json(
      { detail: 'Authentication credentials were not provided.' },
      { status: 401 }
    );
  }

  // Django under WSGI (`manage.py runserver`, the dev compose) reads a body
  // with no Content-Length as EMPTY, so a PATCH "succeeds" having changed
  // nothing. Streaming with the client's length avoids that without buffering,
  // which peaks at ~4.5x the body (~470 MB for one 100 MB upload chunk). A
  // client that sent no length gets its body buffered instead.
  const init: RequestInit & { duplex?: 'half' } = { method: request.method, headers };
  const contentLength = request.headers.get('content-length');
  if (hasBody && contentLength && contentLength !== '0') {
    headers.set('content-length', contentLength);
    init.body = request.body;
    init.duplex = 'half';
  } else if (hasBody && !contentLength) {
    const buffered = await request.arrayBuffer();
    if (buffered.byteLength > 0) init.body = buffered;
  }

  let upstream: Response;
  try {
    upstream = await fetch(targetUrl, init);
  } catch (err) {
    console.error(`[proxy] ${request.method} ${targetUrl} failed`, err);
    return NextResponse.json({ error: 'Upstream request failed' }, { status: 502 });
  }

  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers: pickHeaders(upstream.headers, FORWARDED_RESPONSE_HEADERS),
  });
}

export { handle as GET, handle as POST, handle as PUT, handle as PATCH, handle as DELETE };
