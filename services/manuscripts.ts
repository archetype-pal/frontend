import type { Manuscript } from '@/types/manuscript';
import type { ManuscriptImage } from '@/types/manuscript-image';
import type { HandsResponse } from '@/types/hands';
import type {
  AllographSummary,
  AllographsResponse,
  Position as SymbolPosition,
} from '@/types/allographs';
import { notFound } from 'next/navigation';
import { apiFetch } from '@/lib/api-fetch';

export async function fetchManuscriptImage(id: string): Promise<ManuscriptImage> {
  const response = await apiFetch(`/api/v1/manuscripts/item-images/${id}`);

  if (!response.ok) {
    throw new Error('Failed to fetch manuscript image');
  }

  return response.json();
}

function toRelativePath(next: string | null): string | null {
  if (!next) return null;

  try {
    const url = new URL(next);
    return url.pathname + url.search;
  } catch {
    return next;
  }
}

async function fetchHandsPage(path: string): Promise<HandsResponse> {
  const response = await apiFetch(path);

  if (!response.ok) {
    throw new Error('Failed to fetch hands');
  }

  return response.json();
}

async function fetchAllHandsFromPath(path: string): Promise<HandsResponse> {
  let nextPath: string | null = path;
  let count = 0;
  const results: HandsResponse['results'] = [];

  while (nextPath) {
    const page = await fetchHandsPage(nextPath);
    count = page.count;
    results.push(...page.results);
    nextPath = toRelativePath(page.next);
  }

  return {
    count: count || results.length,
    next: null,
    previous: null,
    results,
  };
}

function buildHandsPath(itemPartId: string | number, itemImageId?: string | number): string {
  const params = new URLSearchParams({
    item_part: String(itemPartId),
    limit: '100',
  });

  if (itemImageId != null) {
    params.set('item_part_images', String(itemImageId));
  }

  return `/api/v1/hands/?${params.toString()}`;
}

export async function fetchHands(
  itemPartId: string | number,
  itemImageId?: string | number
): Promise<HandsResponse> {
  const imageScopedHands = await fetchAllHandsFromPath(buildHandsPath(itemPartId, itemImageId));

  if (itemImageId == null || imageScopedHands.results.length > 0) {
    return imageScopedHands;
  }

  return fetchAllHandsFromPath(buildHandsPath(itemPartId));
}

export async function fetchAllographs(): Promise<AllographsResponse> {
  const response = await apiFetch(`/api/v1/symbols_structure/allographs/`);

  if (!response.ok) {
    throw new Error('Failed to fetch allographs');
  }

  return response.json();
}

// Labels-only allograph list (`?light=1`) — skips the nested component/feature/
// position graph. Use when only id + display label are needed.
export async function fetchAllographSummaries(): Promise<AllographSummary[]> {
  const response = await apiFetch(`/api/v1/symbols_structure/allographs/?light=1`);

  if (!response.ok) {
    throw new Error('Failed to fetch allographs');
  }

  return response.json();
}

export async function fetchManuscript(id: number): Promise<Manuscript> {
  const response = await apiFetch(`/api/v1/manuscripts/item-parts/${id}`);

  if (!response.ok) {
    if (response.status === 404) {
      notFound();
    }
    throw new Error('Failed to fetch manuscript');
  }

  return response.json();
}

export async function fetchPositions(): Promise<SymbolPosition[]> {
  const response = await apiFetch(`/api/v1/symbols_structure/positions/`);

  if (!response.ok) {
    throw new Error('Failed to fetch positions');
  }

  return response.json();
}
