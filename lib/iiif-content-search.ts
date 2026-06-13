import { API_BASE_URL } from '@/lib/api-fetch';

/** A IIIF Content Search hit resolved to the viewer's region annotation. */
export type ContentSearchHit = {
  /** ItemImage id the region lives on (one canvas per image). */
  imageId: string;
  /** TEXT-region Graph id — maps to the `db:{graphId}` annotation in the viewer. */
  graphId: string;
  /** The matched (linked) phrase. */
  value: string;
};

// Hit annotation ids are minted by the backend as
// …/api/v1/iiif/canvas/{imageId}/search/{textId}/{graphId} — parse our own
// stable format to recover the image + graph the hit belongs to.
const HIT_ID = /\/canvas\/(\d+)\/search\/\d+\/(\d+)(?:$|[?#])/;

/**
 * Query the IIIF Content Search 2.0 service for a manuscript part and resolve
 * each hit to the image + region it targets. Returns [] on any failure (the
 * caller treats search-region highlighting as a best-effort enhancement).
 */
export async function fetchContentSearchHits(
  itemPartId: string | number,
  query: string
): Promise<ContentSearchHit[]> {
  const q = query.trim();
  if (!q) return [];
  try {
    const url = `${API_BASE_URL}/api/v1/iiif/item-parts/${itemPartId}/search?q=${encodeURIComponent(q)}`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return [];
    const json = (await res.json()) as {
      items?: Array<{ id?: string; body?: { value?: string } }>;
    };
    const hits: ContentSearchHit[] = [];
    for (const item of json.items ?? []) {
      const match = typeof item.id === 'string' ? item.id.match(HIT_ID) : null;
      if (!match) continue;
      hits.push({ imageId: match[1], graphId: match[2], value: String(item.body?.value ?? '') });
    }
    return hits;
  } catch {
    return [];
  }
}
