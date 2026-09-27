import { BackofficeApiError } from './api-client';
import type { Page, PageListItem } from '@/lib/pages';

// Pages go through Next's own `/api/pages` proxy (not straight to Django
// like most other backoffice resources) so that creating/editing/deleting a
// page can bust the Next route cache for the About menu/sidebar, which is
// rendered on every page of the site. See app/api/pages/route.ts.
const PAGES_API_PATH = '/api/pages';

async function parseOrThrow<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new BackofficeApiError(res.status, data as Record<string, unknown>);
  return data as T;
}

export function getPages(): Promise<PageListItem[]> {
  return fetch(PAGES_API_PATH).then((res) => parseOrThrow<PageListItem[]>(res));
}

export function getPage(slug: string): Promise<Page> {
  return fetch(`${PAGES_API_PATH}/${encodeURIComponent(slug)}`).then((res) =>
    parseOrThrow<Page>(res)
  );
}

export type PageWritePayload = Partial<
  Pick<Page, 'slug' | 'title' | 'content' | 'status' | 'order' | 'include_in_quick_link'>
>;

export function createPage(data: PageWritePayload): Promise<Page> {
  return fetch(PAGES_API_PATH, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }).then((res) => parseOrThrow<Page>(res));
}

export function updatePage(slug: string, data: PageWritePayload): Promise<Page> {
  return fetch(`${PAGES_API_PATH}/${encodeURIComponent(slug)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }).then((res) => parseOrThrow<Page>(res));
}

export async function deletePage(slug: string): Promise<void> {
  const res = await fetch(`${PAGES_API_PATH}/${encodeURIComponent(slug)}`, {
    method: 'DELETE',
  });
  if (res.status === 204) return;
  await parseOrThrow<void>(res);
}
