import { apiFetch } from '@/lib/api-fetch';

type ImageRouteInput = {
  item_part?: number | string | null;
  item_part_id?: number | string | null;
  item_image?: number | string | null;
  id?: number | string | null;
};

type GraphRouteInput = ImageRouteInput & {
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

export function getImageDetailUrl(input: ImageRouteInput): string {
  const imageId = toNumericId(input.item_image) ?? toNumericId(input.id);
  const manuscriptId = toNumericId(input.item_part) ?? toNumericId(input.item_part_id) ?? imageId;
  if (!imageId || !manuscriptId) return '#';
  return `/manuscripts/${manuscriptId}/images/${imageId}`;
}

export function getGraphDetailUrl(input: GraphRouteInput): string {
  const graphId = toNumericId(input.id);
  const imageId = toNumericId(input.item_image);
  const manuscriptId = toNumericId(input.item_part) ?? toNumericId(input.item_part_id);
  if (!graphId || !imageId || !manuscriptId) return '#';
  return `/manuscripts/${manuscriptId}/images/${imageId}?graph=${graphId}`;
}

export async function resolveGraphDetailUrl(input: GraphRouteInput): Promise<string> {
  const direct = getGraphDetailUrl(input);
  if (direct !== '#') return direct;

  const graphId = toNumericId(input.id);
  if (!graphId) return '#';

  try {
    const graphRes = await apiFetch(`/api/v1/manuscripts/graphs/${graphId}/`, {
      cache: 'no-store',
    });
    if (!graphRes.ok) return '#';
    const graphData = (await graphRes.json()) as { item_image?: number | null };
    const imageId = toNumericId(graphData.item_image);
    if (!imageId) return '#';

    const imageRes = await apiFetch(`/api/v1/manuscripts/item-images/${imageId}/`, {
      cache: 'no-store',
    });
    if (!imageRes.ok) return '#';
    const imageData = (await imageRes.json()) as { item_part?: number | null };
    const manuscriptId = toNumericId(imageData.item_part);
    if (!manuscriptId) return '#';

    return `/manuscripts/${manuscriptId}/images/${imageId}?graph=${graphId}`;
  } catch {
    return '#';
  }
}

export async function resolveAndPushGraphDetail(
  input: GraphRouteInput,
  push: (url: string) => void
): Promise<void> {
  const resolvedUrl = await resolveGraphDetailUrl(input);
  if (resolvedUrl !== '#') {
    push(resolvedUrl);
  }
}
