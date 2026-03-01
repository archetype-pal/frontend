export interface BackendGraph {
  id: number;
  item_image: number;
  annotation: {
    type: 'Feature';
    geometry: {
      type: 'Polygon';
      coordinates: number[][][]; // [[[x,y],...]]
    };
    properties?: Record<string, unknown>;
    crs?: unknown;
  };
  allograph: number;
  hand: number;
  graphcomponent_set: Array<{ component: number; features: number[] }>;
  positions: number[];
}

import { apiFetch } from '@/lib/api-fetch';

export async function fetchAnnotationsForImage(
  imageId: string,
  allographId?: string
): Promise<BackendGraph[]> {
  const params = new URLSearchParams({ item_image: imageId });
  if (allographId) params.set('allograph', allographId);
  const res = await apiFetch(`/api/v1/manuscripts/graphs/?${params}`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to load annotations');
  return res.json();
}

export async function postAnnotation(payload: Omit<BackendGraph, 'id'>) {
  const res = await apiFetch(`/api/v1/manuscripts/graphs/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`POST failed: ${res.status} ${text}`);
  }
  return res.json() as Promise<BackendGraph>;
}

export async function patchAnnotation(id: number, partial: Partial<Omit<BackendGraph, 'id'>>) {
  const res = await apiFetch(`/api/v1/manuscripts/graphs/${id}/`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(partial),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PATCH failed: ${res.status} ${text}`);
  }
  return res.json() as Promise<BackendGraph>;
}
