import { NextRequest, NextResponse } from 'next/server';
import { env } from '@/lib/env';
import { getServerAuthToken } from '@/lib/auth-token-server';

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

async function handle(request: NextRequest, { params }: RouteParams) {
  const { path } = await params;
  const token = await getServerAuthToken();

  // Callers drop the trailing slash (see `proxyFetch`) so Next doesn't 308 them,
  // but every route proxied here ends in one (`DefaultRouter`). Forwarding
  // without it makes Django answer with an APPEND_SLASH 301 — so restore it.
  const targetUrl = `${env.serverApiUrl}/${path.join('/')}/${request.nextUrl.search}`;

  const headers = new Headers();
  const contentType = request.headers.get('content-type');
  if (contentType) headers.set('content-type', contentType);
  if (token) headers.set('Authorization', `Token ${token}`);

  // Buffer rather than stream the body: a streamed body goes out chunked with
  // no Content-Length, and Django under WSGI (`manage.py runserver`, the dev
  // compose) reads that as an EMPTY body — a PATCH then "succeeds" having
  // changed nothing. A buffered body also stays replayable across a redirect.
  // Costs memory up to one upload chunk (UPLOADS_CHUNK_SIZE) per request.
  const hasBody = request.method !== 'GET' && request.method !== 'HEAD';
  // Refuse an anonymous write before buffering it, so a client without a
  // cookie can't make this server hold an upload-sized body in memory.
  if (hasBody && !token) {
    return NextResponse.json(
      { detail: 'Authentication credentials were not provided.' },
      { status: 401 }
    );
  }
  const buffered = hasBody ? await request.arrayBuffer() : null;
  const body = buffered && buffered.byteLength > 0 ? buffered : undefined;

  let upstream: Response;
  try {
    upstream = await fetch(targetUrl, { method: request.method, headers, body });
  } catch (err) {
    console.error(`[proxy] ${request.method} ${targetUrl} failed`, err);
    return NextResponse.json({ error: 'Upstream request failed' }, { status: 502 });
  }

  const responseHeaders = new Headers();
  const upstreamContentType = upstream.headers.get('content-type');
  if (upstreamContentType) responseHeaders.set('content-type', upstreamContentType);

  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  });
}

export { handle as GET, handle as POST, handle as PUT, handle as PATCH, handle as DELETE };
