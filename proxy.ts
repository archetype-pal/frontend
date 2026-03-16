import { NextResponse, type NextRequest } from 'next/server';
import { AUTH_TOKEN_COOKIE } from '@/lib/auth-token-cookie';
import type { SectionKey } from '@/lib/site-features';
import type { ResultType } from '@/lib/search-types';

const SECTION_ROUTE_MAP: Partial<Record<SectionKey, string>> = {
  search: '/search',
  collection: '/collection',
  lightbox: '/lightbox',
  news: '/publications/news',
  blogs: '/publications/blogs',
  featureArticles: '/publications/feature',
  about: '/about',
};

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

  if (pathname === '/backoffice' || pathname.startsWith('/backoffice/')) {
    const tokenCookie = request.cookies.get(AUTH_TOKEN_COOKIE)?.value;
    if (!tokenCookie) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('next', pathname);
      return NextResponse.redirect(url);
    }
  }

  const config = await loadConfig(origin);

  for (const [sectionKey, routePrefix] of Object.entries(SECTION_ROUTE_MAP)) {
    if (pathname === routePrefix || pathname.startsWith(routePrefix + '/')) {
      if (config.sections[sectionKey] === false) {
        const url = request.nextUrl.clone();
        url.pathname = '/not-found';
        return NextResponse.rewrite(url);
      }
    }
  }

  const searchMatch = pathname.match(/^\/search\/([^/]+)/);
  if (searchMatch) {
    const categoryType = searchMatch[1] as ResultType;
    const catConfig = config.searchCategories[categoryType];
    if (catConfig && catConfig.enabled === false) {
      const url = request.nextUrl.clone();
      url.pathname = '/not-found';
      return NextResponse.rewrite(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/backoffice',
    '/backoffice/:path*',
    '/search/:path*',
    '/collection/:path*',
    '/collection',
    '/lightbox/:path*',
    '/lightbox',
    '/publications/:path*',
    '/about/:path*',
    '/about',
  ],
};
