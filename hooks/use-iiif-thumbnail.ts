'use client';

import * as React from 'react';
import { getIiifImageUrlWithBounds, coordinatesFromGeoJson } from '@/utils/iiif';

/**
 * Returns a IIIF thumbnail URL for a graph (info URL + optional GeoJSON coordinates).
 * Fetches bounded URL asynchronously; returns null until ready or on error.
 */
export function useIiifThumbnailUrl(
  infoUrl: string,
  coordinatesJson?: string | null
): string | null {
  const trimmed = (infoUrl || '').trim();
  // Use the raw JSON string as the dependency (stable primitive) instead of
  // the parsed coords object which would be a new reference every render.
  const coordsKey = coordinatesJson ?? '';
  const [url, setUrl] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!trimmed) {
      setUrl(null);
      return;
    }
    const coords = coordinatesFromGeoJson(coordsKey || undefined) ?? undefined;
    let cancelled = false;
    getIiifImageUrlWithBounds(trimmed, { coordinates: coords, thumbnail: true })
      .then((u) => {
        if (!cancelled) setUrl(u);
      })
      .catch(() => {
        if (!cancelled) setUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [trimmed, coordsKey]);

  return url;
}
