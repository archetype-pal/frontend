import { apiFetch } from './api-fetch';
import { normalizePage, normalizePageListItem, type Page, type PageListItem } from './pages';

const PAGES_PATH = '/api/v1/pages/';

/**
 * Published pages, ordered for the About menu/sidebar. Any failure —
 * network error, non-200, or an unexpected response shape — resolves to an
 * empty list so SSR never 500s over a backend hiccup (matches
 * `readModelLabels`'s fallback behavior).
 */
export async function getPublishedPages(): Promise<PageListItem[]> {
  try {
    const res = await apiFetch(PAGES_PATH);
    if (!res.ok) return [];
    const raw = await res.json();
    if (!Array.isArray(raw)) return [];
    return raw.map(normalizePageListItem).filter((page): page is PageListItem => page !== null);
  } catch {
    return [];
  }
}

/** A single published page by slug, or null if missing, unpublished, or unreachable. */
export async function getPublishedPageBySlug(slug: string): Promise<Page | null> {
  try {
    const res = await apiFetch(`${PAGES_PATH}${encodeURIComponent(slug)}/`);
    if (!res.ok) return null;
    return normalizePage(await res.json());
  } catch {
    return null;
  }
}
