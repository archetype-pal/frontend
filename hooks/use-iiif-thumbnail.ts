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
  return useIiifThumbnail(infoUrl, coordinatesJson, maxSize).src;
}

/** Like useIiifThumbnailUrl, but also says whether the URL lookup failed. */
export function useIiifThumbnail(
  infoUrl: string,
  coordinatesJson?: string | null,
  maxSize?: number
): { src: string | null; failed: boolean } {
  const trimmed = (infoUrl || '').trim();
  // Use the raw JSON string as the dependency (stable primitive) instead of
  // the parsed coords object which would be a new reference every render.
  const coordsKey = coordinatesJson ?? '';
  const [state, setState] = React.useState<{ src: string | null; failed: boolean }>({
    src: null,
    failed: false,
  });

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
        if (!cancelled) setState({ src: u, failed: false });
      })
      .catch(() => {
        if (!cancelled) setState({ src: null, failed: true });
      });
    return () => {
      cancelled = true;
    };
  }, [trimmed, coordsKey, maxSize]);

  // When there is no input, the result is empty regardless of any stored value
  // (the effect leaves stored state untouched in that case).
  return trimmed ? state : { src: null, failed: false };
}
