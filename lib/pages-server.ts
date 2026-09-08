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
    if (!res.ok) return []; // apiFetch already logged the non-2xx above.
    const raw = await res.json();
    if (!Array.isArray(raw)) {
      // A 200 with a malformed body isn't an HTTP-layer failure, so apiFetch
      // never sees it (see the equivalent check in model-labels-server.ts).
      console.error(`[API] GET ${PAGES_PATH} → 200 with unexpected body shape`, raw);
      return [];
    }
    return raw.map(normalizePageListItem).filter((page): page is PageListItem => page !== null);
  } catch {
    return [];
  }
}

/** A single published page by slug, or null if missing, unpublished, or unreachable. */
export async function getPublishedPageBySlug(slug: string): Promise<Page | null> {
  const path = `${PAGES_PATH}${encodeURIComponent(slug)}/`;
  try {
    const res = await apiFetch(path);
    if (!res.ok) return null; // apiFetch already logged the non-2xx above.
    const raw = await res.json();
    const page = normalizePage(raw);
    if (page === null) {
      // normalizePage returning null for a 200 response means the body
      // didn't match the expected Page shape — same "silent until you grep
      // the access log" blind spot as the other fallbacks here.
      console.error(`[API] GET ${path} → 200 with unexpected body shape`, raw);
    }
    return page;
  } catch {
    return null;
  }
}
