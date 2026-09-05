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
  item_part?: number | null;
  image_iiif?: string | null;
  annotation_type?: 'image' | 'text' | 'editorial' | 'unknown' | null;
  note?: string;
  internal_note?: string;
  annotation: {
    type: 'Feature';
    geometry: {
      type: 'Polygon';
      coordinates: number[][][]; // [[[x,y],...]]
    };
    properties?: Record<string, unknown>;
    crs?: unknown;
  };
  allograph: number | null;
  allograph_name?: string | null;
  hand: number | null;
  graphcomponent_set: BackendGraphComponent[];
  positions: number[];
  position_details?: BackendPositionDetail[];
  num_features?: number;
  is_described?: boolean;
}

import { authFetch } from '@/lib/api-fetch';

const JSON_HEADERS: HeadersInit = { 'Content-Type': 'application/json' };

export async function fetchAnnotationsForImage(
  imageId: string,
  allographId?: string,
  annotationType: string | null = 'image',
  token?: string | null
): Promise<BackendGraph[]> {
  const params = new URLSearchParams({ item_image: imageId });
  if (allographId) params.set('allograph', allographId);
  if (annotationType) params.set('annotation_type', annotationType);
  const res = await authFetch(`/api/v1/manuscripts/graphs/?${params.toString()}`, token ?? null, {
    cache: 'no-store',
  });
  if (!res.ok) throw new Error('Failed to load annotations');
  return res.json();
}

/**
 * Hydrate an arbitrary array of graph IDs into full BackendGraph entities.
 * Automatically chunks large requests to avoid proxy query-string limits.
 */
export async function fetchGraphsByIds(
  ids: number[],
  token?: string | null
): Promise<BackendGraph[]> {
  if (ids.length === 0) return [];

  const CHUNK_SIZE = 300;
  const chunks: number[][] = [];
  for (let i = 0; i < ids.length; i += CHUNK_SIZE) {
    chunks.push(ids.slice(i, i + CHUNK_SIZE));
  }

  const responses = await Promise.all(
    chunks.map(async (chunk) => {
      const params = new URLSearchParams({ id__in: chunk.join(',') });
      const res = await authFetch(
        `/api/v1/manuscripts/graphs/?${params.toString()}`,
        token ?? null,
        { cache: 'no-store' }
      );
      if (!res.ok) throw new Error(`Failed to load graphs: ${res.status}`);
      return (await res.json()) as BackendGraph[];
    })
  );

  return responses.flat();
}

type ViewerAnnotationWritePayload = {
  item_image?: number;
  annotation?: BackendGraph['annotation'];
  annotation_type?: 'image' | 'editorial';
  allograph?: number | null;
  hand?: number | null;
  graphcomponent_set?: BackendGraphComponent[];
  positions?: number[];
  note?: string;
  internal_note?: string;
};

export async function createViewerAnnotation(
  token: string,
  payload: ViewerAnnotationWritePayload & {
    item_image: number;
    annotation: BackendGraph['annotation'];
  }
) {
  const res = await authFetch(`/api/v1/annotations/graphs/`, token, {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify({
      ...payload,
      annotation_type: payload.annotation_type ?? 'image',
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
  partial: ViewerAnnotationWritePayload
) {
  const res = await authFetch(`/api/v1/annotations/graphs/${id}/`, token, {
    method: 'PATCH',
    headers: JSON_HEADERS,
    body: JSON.stringify(partial),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PATCH failed: ${res.status} ${text}`);
  }
  return res.json() as Promise<BackendGraph>;
}

export async function deleteViewerAnnotation(token: string, id: number): Promise<void> {
  const res = await authFetch(`/api/v1/annotations/graphs/${id}/`, token, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`DELETE failed: ${res.status} ${text}`);
  }
}
