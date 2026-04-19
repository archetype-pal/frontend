export interface BackendFeatureDetail {
  id: number;
  name: string;
}

export interface BackendPositionDetail {
  id: number;
  name: string;
}

export interface BackendGraphComponent {
  component: number;
  component_name?: string;
  features: number[];
  feature_details?: BackendFeatureDetail[];
}

export interface BackendGraph {
  id: number;
  item_image: number;
  annotation_type?: string;
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
  graphcomponent_set: BackendGraphComponent[];
  positions: number[];
  position_details?: BackendPositionDetail[];
  num_features?: number;
  is_described?: boolean;
}

import { apiFetch } from '@/lib/api-fetch';

function authHeaders(token: string): HeadersInit {
  return {
    'Content-Type': 'application/json',
    Authorization: `Token ${token}`,
  };
}

export async function fetchAnnotationsForImage(
  imageId: string,
  allographId?: string,
  annotationType: string = 'image'
): Promise<BackendGraph[]> {
  const params = new URLSearchParams({ item_image: imageId });
  if (allographId) params.set('allograph', allographId);
  if (annotationType) params.set('annotation_type', annotationType);
  const res = await apiFetch(`/api/v1/manuscripts/graphs/?${params.toString()}`, {
    cache: 'no-store',
  });
  if (!res.ok) throw new Error('Failed to load annotations');
  return res.json();
}

export async function createViewerAnnotation(
  token: string,
  payload: Omit<BackendGraph, 'id' | 'annotation_type'> & { annotation_type?: 'image' }
) {
  const res = await apiFetch(`/api/v1/annotations/graphs/`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({
      ...payload,
      annotation_type: 'image',
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`POST failed: ${res.status} ${text}`);
  }
  return res.json() as Promise<BackendGraph>;
}

export async function updateViewerAnnotation(
  token: string,
  id: number,
  partial: Partial<Omit<BackendGraph, 'id' | 'annotation_type'>> & { annotation_type?: 'image' }
) {
  const res = await apiFetch(`/api/v1/annotations/graphs/${id}/`, {
    method: 'PATCH',
    headers: authHeaders(token),
    body: JSON.stringify({
      ...partial,
      annotation_type: 'image',
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PATCH failed: ${res.status} ${text}`);
  }
  return res.json() as Promise<BackendGraph>;
}

export async function deleteViewerAnnotation(token: string, id: number): Promise<void> {
  const res = await apiFetch(`/api/v1/annotations/graphs/${id}/`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`DELETE failed: ${res.status} ${text}`);
  }
}
