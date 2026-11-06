'use client';

import * as React from 'react';

import { getSavedImageAllographIds } from '@/lib/manuscript-viewer-data';
import type { Annotation as A9sAnnotation } from '@/components/manuscript/manuscript-annotorious';
import type { Allograph } from '@/types/allographs';

const NO_ALLOGRAPHS: Allograph[] = [];

/**
 * The allographs on one image's saved graphs, read off its loaded annotations.
 *
 * - `allographsForThisImage` scopes the side panel; it is every allograph until
 *   the image has a saved graph with one.
 * - `headerAllographsForThisImage` feeds the header picker; it stays empty until
 *   `loaded` (this image's annotations are in).
 *
 * A filtered allograph the image no longer carries is cleared.
 */
export function useImageAllographs({
  allographs,
  annotations,
  loaded,
  filteredAllograph,
  setFilteredAllograph,
  setHoveredAllograph,
}: {
  allographs: Allograph[];
  annotations: A9sAnnotation[];
  loaded: boolean;
  filteredAllograph: Allograph | undefined;
  setFilteredAllograph: (allograph: Allograph | undefined) => void;
  setHoveredAllograph: (allograph: Allograph | undefined) => void;
}) {
  const imageAllographIds = React.useMemo(
    () => (loaded ? getSavedImageAllographIds(annotations) : []),
    [loaded, annotations]
  );

  const allographsForThisImage = React.useMemo(() => {
    if (!imageAllographIds.length) return allographs;
    const idSet = new Set(imageAllographIds);
    return allographs.filter((a) => idSet.has(a.id));
  }, [allographs, imageAllographIds]);

  const headerAllographsForThisImage = imageAllographIds.length
    ? allographsForThisImage
    : NO_ALLOGRAPHS;

  React.useEffect(() => {
    if (!filteredAllograph || !loaded) return;
    if (headerAllographsForThisImage.some((allograph) => allograph.id === filteredAllograph.id)) {
      return;
    }
    setFilteredAllograph(undefined);
    setHoveredAllograph(undefined);
  }, [
    headerAllographsForThisImage,
    filteredAllograph,
    loaded,
    setFilteredAllograph,
    setHoveredAllograph,
  ]);

  const availableAllographFilterIds = React.useMemo(
    () => allographsForThisImage.map((allograph) => allograph.id),
    [allographsForThisImage]
  );

  return { allographsForThisImage, headerAllographsForThisImage, availableAllographFilterIds };
}
