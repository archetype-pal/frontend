import { apiFetch } from './api-fetch';
import {
  normalizeMenuHeading,
  normalizePage,
  normalizePageListItem,
  type MenuHeading,
  type Page,
  type PageListItem,
} from './pages';

const PAGES_PATH = '/api/v1/pages/';
const MENU_HEADINGS_PATH = '/api/v1/menu-headings/';

/**
 * Published pages, ordered for the menu dropdowns/sidebars. Any failure —
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

/** Custom menu headings. Same empty-list fallback as `getPublishedPages`. */
export async function getMenuHeadings(): Promise<MenuHeading[]> {
  try {
    const res = await apiFetch(MENU_HEADINGS_PATH);
    if (!res.ok) return []; // apiFetch already logged the non-2xx above.
    const raw = await res.json();
    if (!Array.isArray(raw)) {
      console.error(`[API] GET ${MENU_HEADINGS_PATH} → 200 with unexpected body shape`, raw);
      return [];
    }
    return raw.map(normalizeMenuHeading).filter((h): h is MenuHeading => h !== null);
  } catch {
    return [];
  }
}
