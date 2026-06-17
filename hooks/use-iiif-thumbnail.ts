'use client';

import * as React from 'react';
import { getIiifImageUrlWithBounds, coordinatesFromGeoJson } from '@/utils/iiif';

/**
 * Returns a IIIF thumbnail URL for a graph (info URL + optional GeoJSON coordinates).
 * Fetches bounded URL asynchronously; returns null until ready or on error.
 */
export function useIiifThumbnailUrl(
  infoUrl: string,
  coordinatesJson?: string | null,
  maxSize?: number
): string | null {
  const trimmed = (infoUrl || '').trim();
  // Use the raw JSON string as the dependency (stable primitive) instead of
  // the parsed coords object which would be a new reference every render.
  const coordsKey = coordinatesJson ?? '';
  const [url, setUrl] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!trimmed) {
      // No input: the empty-state value is derived during render (see the
      // return below), so there is nothing to fetch or synchronize here.
      return;
    }
    const coords = coordinatesFromGeoJson(coordsKey || undefined) ?? undefined;
    let cancelled = false;
    getIiifImageUrlWithBounds(trimmed, {
      coordinates: coords,
      thumbnail: true,
      flipY: true,
      ...(maxSize ? { maxSize } : {}),
    })
      .then((u) => {
        if (!cancelled) setUrl(u);
      })
      .catch(() => {
        if (!cancelled) setUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [trimmed, coordsKey, maxSize]);

  // When there is no input, the result is null regardless of any stored value
  // (the effect leaves stored state untouched in that case).
  return trimmed ? url : null;
}
