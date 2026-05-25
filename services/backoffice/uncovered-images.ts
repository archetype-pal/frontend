/**
 * Coverage drilldown: pulls item-images that have no text (or no
 * transcription, or no translation) so editors can triage the
 * dashboard's coverage donut against actual rows.
 */

import { authFetch } from '@/lib/api-fetch';

export interface UncoveredImage {
  id: number;
  item_part: number;
  image: string | null;
  locus: string;
  annotation_count: number;
  // The serializer inlines texts already attached to this image — used
  // for "has_transcription/has_translation" mode where the image may
  // still have one of the two kinds.
  texts: Array<{ id: number; type: string; status: string; language: string }>;
}

export interface PaginatedUncovered {
  count: number;
  next: string | null;
  previous: string | null;
  results: UncoveredImage[];
}

export type UncoveredMode = 'either' | 'transcription' | 'translation';

export async function fetchUncoveredImages(
  token: string,
  mode: UncoveredMode = 'either',
  page = 0,
  pageSize = 25
): Promise<PaginatedUncovered> {
  const qs = new URLSearchParams({ limit: String(pageSize), offset: String(page * pageSize) });
  if (mode === 'either') qs.set('has_text', 'false');
  if (mode === 'transcription') qs.set('has_transcription', 'false');
  if (mode === 'translation') qs.set('has_translation', 'false');
  const r = await authFetch(`/api/v1/manuscripts/management/item-images/?${qs.toString()}`, token, {
    cache: 'no-store',
  });
  if (!r.ok) throw new Error(`Failed to fetch uncovered images: ${r.status}`);
  return r.json();
}
