import { NextResponse, type NextRequest } from 'next/server';
import { AUTH_TOKEN_COOKIE } from '@/lib/auth-token-cookie';

// Security headers and the backoffice sign-in redirect, nothing else. Site
// configuration is read where it is used: each switchable section 404s itself
// from its layout (`lib/route-gates.ts`), and search redirects to an enabled
// category from its pages.

const isProduction = process.env.NODE_ENV === 'production';

// Dev keeps 'unsafe-inline'/'unsafe-eval' so React Fast Refresh works; prod
// keeps nonce support but allows same-origin script chunks explicitly.
function buildCsp(nonce: string): string {
  const directives: string[] = [
    "default-src 'self'",
    isProduction
      ? `script-src 'self' 'nonce-${nonce}'`
      : `script-src 'self' 'unsafe-inline' 'unsafe-eval'`,
    "style-src 'self' 'unsafe-inline'",
    isProduction ? "img-src 'self' data: blob: https:" : "img-src 'self' data: blob: https: http:",
    "font-src 'self' data:",
    isProduction ? "connect-src 'self' https:" : "connect-src 'self' https: http: ws: wss:",
    "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'self'",
  ];
  if (isProduction) {
    directives.push('upgrade-insecure-requests');
  }
  return directives.join('; ');
}

function attachSecurityHeaders(response: NextResponse, nonce: string, csp: string): NextResponse {
  response.headers.set('Content-Security-Policy', csp);
  if (isProduction) {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    );
  }
  response.headers.set('x-nonce', nonce);
  return response;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const csp = buildCsp(nonce);

  // Propagate nonce + CSP into the inner request so RSC components can read
  // them via headers() — needed for Next's nonce-aware script injection.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('content-security-policy', csp);

  if (pathname === '/backoffice' || pathname.startsWith('/backoffice/')) {
    const tokenCookie = request.cookies.get(AUTH_TOKEN_COOKIE)?.value;
    if (!tokenCookie) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('next', pathname);
      return attachSecurityHeaders(NextResponse.redirect(url), nonce, csp);
    }
  }

  return attachSecurityHeaders(
    NextResponse.next({ request: { headers: requestHeaders } }),
    nonce,
    csp
  );
}

// Every HTML response needs the CSP. API routes, Next internals and static
// assets are excluded: they don't render HTML, and a CSP on an asset just
// bloats the request.
export const config = {
  matcher: [
    {
      source: '/((?!api|_next/static|_next/image|favicon.ico).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
};
