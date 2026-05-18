import { NextResponse, type NextRequest } from 'next/server';
import { AUTH_TOKEN_COOKIE } from '@/lib/auth-token-cookie';
import type { SectionKey } from '@/lib/site-features';
import type { ResultType } from '@/lib/search-types';

const isProduction = process.env.NODE_ENV === 'production';

const SECTION_ROUTE_MAP: Partial<Record<SectionKey, string>> = {
  search: '/search',
  collection: '/collection',
  lightbox: '/lightbox',
  news: '/publications/news',
  blogs: '/publications/blogs',
  featureArticles: '/publications/feature',
  about: '/about',
};

// CSP / security-header concerns previously lived in middleware.ts. Next 16
// requires middleware to be merged into proxy.ts, so they ride along here.
// Dev keeps 'unsafe-inline'/'unsafe-eval' so React Fast Refresh works; prod
// uses a per-request nonce with strict-dynamic.
function buildCsp(nonce: string): string {
  const directives: string[] = [
    "default-src 'self'",
    isProduction
      ? `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`
      : `script-src 'self' 'unsafe-inline' 'unsafe-eval'`,
    "style-src 'self' 'unsafe-inline'",
    isProduction ? "img-src 'self' data: blob: https:" : "img-src 'self' data: blob: https: http:",
    "font-src 'self' data:",
    isProduction ? "connect-src 'self' https:" : "connect-src 'self' https: http: ws: wss:",
    "frame-src 'self'",
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

type MinConfig = {
  sections: Record<string, boolean>;
  searchCategories: Record<string, { enabled: boolean }>;
};

let cachedConfig: MinConfig | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 10_000;

async function loadConfig(origin: string): Promise<MinConfig> {
  const now = Date.now();
  if (cachedConfig && now - cacheTimestamp < CACHE_TTL) {
    return cachedConfig;
  }

  try {
    const res = await fetch(`${origin}/api/site-features`, {
      cache: 'no-store',
    });
    if (res.ok) {
      cachedConfig = (await res.json()) as MinConfig;
      cacheTimestamp = now;
      return cachedConfig;
    }
  } catch {
    // Fall through to defaults
  }

  return { sections: {}, searchCategories: {} };
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const origin = request.nextUrl.origin;

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

  const featureConfig = await loadConfig(origin);

  for (const [sectionKey, routePrefix] of Object.entries(SECTION_ROUTE_MAP)) {
    if (pathname === routePrefix || pathname.startsWith(routePrefix + '/')) {
      if (featureConfig.sections[sectionKey] === false) {
        const url = request.nextUrl.clone();
        url.pathname = '/not-found';
        return attachSecurityHeaders(NextResponse.rewrite(url), nonce, csp);
      }
    }
  }

  const searchMatch = pathname.match(/^\/search\/([^/]+)/);
  if (searchMatch) {
    const categoryType = searchMatch[1] as ResultType;
    const catConfig = featureConfig.searchCategories[categoryType];
    if (catConfig && catConfig.enabled === false) {
      const url = request.nextUrl.clone();
      url.pathname = '/not-found';
      return attachSecurityHeaders(NextResponse.rewrite(url), nonce, csp);
    }
  }

  return attachSecurityHeaders(
    NextResponse.next({ request: { headers: requestHeaders } }),
    nonce,
    csp
  );
}

// Matcher inherited from the former middleware (broad — every HTML response
// needs the CSP). API routes, Next internals, and static assets are excluded
// because they don't render HTML and CSP-on-asset just bloats every request.
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
