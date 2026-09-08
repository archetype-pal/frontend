import { apiFetch, authFetch } from '@/lib/api-fetch';
import { env } from '@/lib/env';
import type { CarouselItem, PartnerItem } from '@/types/backoffice';
import type { UserProfile } from '@/types';

export interface PublicationAuthor {
  first_name: string;
  last_name: string;
}

export interface Publication {
  id: number | string;
  title: string;
  slug: string;
  content: string;
  preview: string;
  keywords: string;
  status: string;
  is_blog_post: boolean;
  is_news: boolean;
  is_featured: boolean;
  allow_comments: boolean;
  author: PublicationAuthor;
  author_name: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  number_of_comments: number;
}

interface AuthToken {
  auth_token: string;
}

interface PaginatedPublications {
  results: Publication[];
  count: number;
}

/**
 * Build an absolute, browser-facing URL for carousel/partner images.
 *
 * Resolved against the public origin, not API_BASE_URL: the result lands in an
 * `<img src>`, and during SSR API_BASE_URL is the container-internal INTERNAL_API_URL
 * (e.g. `http://api`) that no browser can resolve. DRF serialises ImageFields with
 * build_absolute_uri, so a server-side fetch returns absolute URLs carrying that
 * internal host — re-host those, and leave genuinely external images alone.
 */
export function getCarouselImageUrl(imagePath: string | null | undefined): string {
  if (!imagePath) return '/placeholder.svg';
  const base = env.apiUrl.replace(/\/$/, '');

  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    try {
      const { pathname, search } = new URL(imagePath);
      if (pathname.startsWith('/media/')) return `${base}${pathname}${search}`;
    } catch {
      // Unparseable URL — hand it back untouched.
    }
    return imagePath;
  }

  return imagePath.startsWith('/') ? `${base}${imagePath}` : `${base}/${imagePath}`;
}

/**
 * Normalize mixed carousel image values to backend-relative media paths.
 * Examples:
 * - "https://host/media/carousel/a.jpg" -> "carousel/a.jpg"
 * - "/media/carousel/a.jpg" -> "carousel/a.jpg"
 * - "carousel/a.jpg" -> "carousel/a.jpg"
 */
export function normalizeCarouselImagePath(imagePath: string): string {
  let value = imagePath.trim();
  if (!value) return '';

  if (value.startsWith('http://') || value.startsWith('https://')) {
    try {
      const parsed = new URL(value);
      value = parsed.pathname;
    } catch {
      // Keep original value when URL parsing fails.
    }
  }

  try {
    value = decodeURIComponent(value);
  } catch {
    // Keep original value when malformed encoding is encountered.
  }

  value = value.replace(/^\/+/, '');
  if (value.startsWith('media/')) {
    value = value.slice('media/'.length);
  }
  return value;
}

/** Derive picker start folder from a carousel image path/url. */
export function getCarouselPickerStartPath(imagePath: string): string {
  const normalized = normalizeCarouselImagePath(imagePath);
  if (!normalized.includes('/')) return '';
  return normalized.split('/').slice(0, -1).join('/');
}

export async function loginUser(username: string, password: string): Promise<AuthToken> {
  const response = await apiFetch(`/api/v1/auth/token/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ username, password }),
  });

  if (!response.ok) {
    throw new Error('Login failed');
  }

  return response.json() as Promise<AuthToken>;
}

export async function logoutUser(token: string) {
  const response = await authFetch(`/api/v1/auth/token/logout`, token, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Logout failed');
  }
}

export async function getUserProfile(token: string): Promise<UserProfile> {
  const response = await authFetch(`/api/v1/auth/profile`, token);

  if (!response.ok) {
    throw new Error('Failed to fetch user profile');
  }

  return response.json() as Promise<UserProfile>;
}

export type PublicationParams = {
  is_news?: boolean;
  is_featured?: boolean;
  is_blog_post?: boolean;
  limit?: number;
  offset?: number;
};

export async function getPublications(params: PublicationParams): Promise<PaginatedPublications> {
  const searchParams = new URLSearchParams();

  if (params.is_news) searchParams.append('is_news', 'true');
  if (params.is_featured) searchParams.append('is_featured', 'true');
  if (params.is_blog_post) searchParams.append('is_blog_post', 'true');

  if (params.limit) searchParams.append('limit', params.limit.toString());
  if (params.offset) searchParams.append('offset', params.offset.toString());

  const qs = searchParams.toString();
  const path = `/api/v1/media/publications/${qs ? `?${qs}` : ''}`;

  const res = await apiFetch(path);
  if (!res.ok) throw new Error('Failed to fetch publications');

  return res.json() as Promise<PaginatedPublications>;
}

/** Thrown when the publication API returns 404. Use in pages to call notFound(). */
export class PublicationNotFoundError extends Error {
  constructor() {
    super('Publication not found');
    this.name = 'PublicationNotFoundError';
  }
}

export async function getPublicationItem(slug: string): Promise<Publication> {
  const res = await apiFetch(`/api/v1/media/publications/${slug}`);
  if (res.status === 404) throw new PublicationNotFoundError();
  if (!res.ok) throw new Error('Failed to fetch publication item');

  return res.json() as Promise<Publication>;
}

export async function fetchCarouselItems(): Promise<CarouselItem[]> {
  const cacheKey = '__carousel_items_cache__';
  const cacheTtlMs = 60_000;

  if (typeof window !== 'undefined') {
    const cached = window.sessionStorage.getItem(cacheKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached) as { ts: number; data: CarouselItem[] };
        if (Date.now() - parsed.ts < cacheTtlMs && Array.isArray(parsed.data)) {
          return parsed.data;
        }
      } catch {
        // Ignore malformed cache and continue with network fetch.
      }
    }
  }

  try {
    const response = await apiFetch(`/api/v1/media/carousel-items/`);
    if (!response.ok) {
      throw new Error('Failed to fetch carousel items');
    }
    const data: CarouselItem[] = await response.json();

    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem(cacheKey, JSON.stringify({ ts: Date.now(), data }));
    }

    return data;
  } catch (error) {
    console.error('Error fetching carousel items:', error);
    throw error;
  }
}

/** Public read of the backoffice-managed partners list, used by the footer. */
export async function fetchPartners(): Promise<PartnerItem[]> {
  const response = await apiFetch(`/api/v1/media/partners/`);
  if (!response.ok) {
    throw new Error('Failed to fetch partners');
  }
  return response.json() as Promise<PartnerItem[]>;
}
