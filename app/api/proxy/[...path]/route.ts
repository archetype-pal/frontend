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

  // Next strips the trailing slash before this handler runs (a 308 from
  // `/…/7/` to `/…/7`), but every Django route ends in one (`DefaultRouter`).
  // Forwarding without it makes Django answer with an APPEND_SLASH 301, which
  // `fetch` can't follow for a streamed PATCH/POST/DELETE body — so restore it.
  const targetUrl = `${env.serverApiUrl}/${path.join('/')}/${request.nextUrl.search}`;

  const headers = new Headers();
  const contentType = request.headers.get('content-type');
  if (contentType) headers.set('content-type', contentType);
  if (token) headers.set('Authorization', `Token ${token}`);

  const hasBody = request.method !== 'GET' && request.method !== 'HEAD';

  let upstream: Response;
  try {
    upstream = await fetch(targetUrl, {
      method: request.method,
      headers,
      body: hasBody ? request.body : undefined,
      // Required by undici when streaming a ReadableStream request body.
      ...(hasBody ? { duplex: 'half' } : {}),
    } as RequestInit);
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
