import { NextResponse, type NextRequest } from 'next/server';
import type { SectionKey } from '@/lib/site-features';
import type { ResultType } from '@/lib/search-types';

const SECTION_ROUTE_MAP: Record<SectionKey, string> = {
  search: '/search',
  collection: '/collection',
  lightbox: '/lightbox',
  news: '/news',
  blogs: '/blogs',
  featureArticles: '/feature',
  events: '/events',
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
    '/search/:path*',
    '/collection/:path*',
    '/collection',
    '/lightbox/:path*',
    '/lightbox',
    '/news/:path*',
    '/news',
    '/blogs/:path*',
    '/blogs',
    '/feature/:path*',
    '/feature',
    '/events/:path*',
    '/events',
    '/about/:path*',
    '/about',
  ],
};
