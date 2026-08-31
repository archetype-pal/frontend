/**
 * Public search-index access for the `<ref>` resource picker (roadmap 4.2).
 *
 * Reuses the site's PUBLIC search endpoint — `GET /api/v1/search/{segment}/?q=`
 * (the same `SearchViewSet.list` route the public search page and
 * `lib/lightbox-params.ts` already hit) — via the shared `apiFetch` helper. It
 * deliberately does NOT depend on the parallel-owned frontend search stack
 * (`lib/search-*`, `components/search`, …): the picker only needs a keyword →
 * hits lookup, so it calls the documented endpoint directly rather than
 * importing that WIP surface.
 *
 * Only the id + display fields the picker maps into a `ResourceRef` are typed;
 * every index returns more attributes, ignored here.
 */

import { apiFetch } from '@/lib/api-fetch';

/** A scribe hit (the `scribes` index) → resolves to `/scribes/{id}`. */
export interface ScribeHit {
  id: number;
  name?: string;
  scriptorium?: string;
  period?: string;
}

/** An item-part hit (the `item-parts` index) → resolves to `/manuscripts/{id}`. */
export interface ItemPartHit {
  id: number;
  display_label?: string;
  repository_name?: string;
  shelfmark?: string;
}

/**
 * An item-image hit (the `item-images` index) → resolves to
 * `/manuscripts/{item_part}/images/{id}`. `item_part` is the ONLY route to a
 * valid target and the document drops null fields, so a hit without it cannot
 * be linked at all.
 */
export interface ItemImageHit {
  id: number;
  item_part?: number;
  locus?: string;
  display_label?: string;
  shelfmark?: string;
}

/** A place-mention hit (the `places` index) — names only; target is a search link. */
export interface PlaceHit {
  id: number | string;
  name?: string;
  place_type?: string;
}

interface SearchListResponse<H> {
  results?: H[];
  total?: number;
}

async function searchIndex<H>(
  segment: string,
  q: string,
  limit: number,
  signal?: AbortSignal
): Promise<H[]> {
  const params = new URLSearchParams({ q, limit: String(limit) });
  const res = await apiFetch(`/api/v1/search/${segment}/?${params.toString()}`, { signal });
  if (!res.ok) throw new Error(`Search request failed (${res.status})`);
  const data = (await res.json()) as SearchListResponse<H>;
  return Array.isArray(data.results) ? data.results : [];
}

export function searchScribes(q: string, limit = 12, signal?: AbortSignal): Promise<ScribeHit[]> {
  return searchIndex<ScribeHit>('scribes', q, limit, signal);
}

export function searchItemParts(
  q: string,
  limit = 12,
  signal?: AbortSignal
): Promise<ItemPartHit[]> {
  return searchIndex<ItemPartHit>('item-parts', q, limit, signal);
}

export function searchPlaces(q: string, limit = 20, signal?: AbortSignal): Promise<PlaceHit[]> {
  return searchIndex<PlaceHit>('places', q, limit, signal);
}

export function searchItemImages(
  q: string,
  limit = 12,
  signal?: AbortSignal
): Promise<ItemImageHit[]> {
  return searchIndex<ItemImageHit>('item-images', q, limit, signal);
}
