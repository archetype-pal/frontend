import { apiFetch } from '@/lib/api-fetch';

export type ImageRouteInput = {
  item_part?: number | string | null;
  item_part_id?: number | string | null;
  item_image?: number | string | null;
  id?: number | string | null;
};

export type GraphRouteInput = ImageRouteInput & {
  id: number | string;
};

export function toNumericId(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function getImageDetailUrl(input: ImageRouteInput): string | null {
  const imageId = toNumericId(input.item_image) ?? toNumericId(input.id);
  const manuscriptId = toNumericId(input.item_part) ?? toNumericId(input.item_part_id) ?? imageId;
  if (!imageId || !manuscriptId) return null;
  return `/manuscripts/${manuscriptId}/images/${imageId}`;
}

/**
 * Detail URL for a text-derived search hit (text, clause, person, place). These
 * open the viewer of the image they annotate, but their own `id` is the hit's id
 * (a text id, or a string like `12_p0`), not an image id, so unlike
 * `getImageDetailUrl` they must never fall back to it. archetype-pal/frontend#142
 */
export function getAnnotatedHitDetailUrl(input: ImageRouteInput): string | null {
  const imageId = toNumericId(input.item_image);
  const manuscriptId = toNumericId(input.item_part) ?? toNumericId(input.item_part_id);
  if (!imageId || !manuscriptId) return null;
  return `/manuscripts/${manuscriptId}/images/${imageId}`;
}

export function getGraphDetailUrl(input: GraphRouteInput): string | null {
  const graphId = toNumericId(input.id);
  const imageId = toNumericId(input.item_image);
  const manuscriptId = toNumericId(input.item_part) ?? toNumericId(input.item_part_id);
  if (!graphId || !imageId || !manuscriptId) return null;
  return `/manuscripts/${manuscriptId}/images/${imageId}?graph=${graphId}`;
}

export async function resolveGraphDetailUrl(input: GraphRouteInput): Promise<string | null> {
  const direct = getGraphDetailUrl(input);
  if (direct) return direct;

  const graphId = toNumericId(input.id);
  if (!graphId) return null;

  try {
    const graphRes = await apiFetch(`/api/v1/manuscripts/graphs/${graphId}/`, {
      cache: 'no-store',
    });
    if (!graphRes.ok) return null;
    const graphData = (await graphRes.json()) as { item_image?: number | null };
    const imageId = toNumericId(graphData.item_image);
    if (!imageId) return null;

    const imageRes = await apiFetch(`/api/v1/manuscripts/item-images/${imageId}/`, {
      cache: 'no-store',
    });
    if (!imageRes.ok) return null;
    const imageData = (await imageRes.json()) as { item_part?: number | null };
    const manuscriptId = toNumericId(imageData.item_part);
    if (!manuscriptId) return null;

    return `/manuscripts/${manuscriptId}/images/${imageId}?graph=${graphId}`;
  } catch {
    return null;
  }
}
