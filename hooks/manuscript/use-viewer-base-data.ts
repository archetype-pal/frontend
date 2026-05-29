'use client';

import * as React from 'react';

import { fetchHands } from '@/services/manuscripts';
import {
  fetchImageAllographIds,
  fetchManuscriptViewerBaseData,
} from '@/lib/manuscript-viewer-data';
import type { ManuscriptImage as ManuscriptImageType } from '@/types/manuscript-image';
import type { Manuscript } from '@/types/manuscript';
import type { Allograph } from '@/types/allographs';
import type { HandType } from '@/types/hands';

/**
 * Loads the viewer's base data for an image, extracted from
 * manuscript-viewer.tsx (Track D1): the image + manuscript + allographs + IIIF
 * height, the hands list, and the allograph ids present on the image. Exposes
 * setHands/setHandsLoaded because the imageId-change reset still clears them.
 */
export function useViewerBaseData(imageId: string) {
  const [manuscriptImage, setManuscriptImage] = React.useState<ManuscriptImageType | null>(null);
  const [manuscript, setManuscript] = React.useState<Manuscript | null>(null);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string | null>(null);

  const [allographs, setAllographs] = React.useState<Allograph[]>([]);
  const [imageAllographIds, setImageAllographIds] = React.useState<number[]>([]);

  const [hands, setHands] = React.useState<HandType[]>([]);
  const [handsLoaded, setHandsLoaded] = React.useState(false);

  const [imageHeight, setImageHeight] = React.useState<number>(0);

  // load image + manuscript + allographs + IIIF height
  React.useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      try {
        setLoading(true);

        const { image, manuscript, allographs, imageHeight } =
          await fetchManuscriptViewerBaseData(imageId);

        if (!isMounted) return;

        setManuscriptImage(image);
        setManuscript(manuscript);
        setAllographs(allographs);
        setImageHeight(imageHeight);
        setError(null);
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load manuscript data');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    void loadData();

    return () => {
      isMounted = false;
    };
  }, [imageId]);

  // load hands for the current image
  React.useEffect(() => {
    if (!manuscriptImage?.item_part) {
      setHands([]);
      setHandsLoaded(false);
      return;
    }

    let isMounted = true;

    const loadHands = async () => {
      try {
        const handsData = await fetchHands(manuscriptImage.item_part, manuscriptImage.id);
        if (isMounted) setHands(handsData.results);
      } catch {
        if (isMounted) setHands([]);
      } finally {
        if (isMounted) setHandsLoaded(true);
      }
    };

    void loadHands();

    return () => {
      isMounted = false;
    };
  }, [manuscriptImage?.id, manuscriptImage?.item_part]);

  // load allograph ids present on this image
  React.useEffect(() => {
    if (!manuscriptImage) return;

    let isMounted = true;

    const loadAllographIds = async () => {
      try {
        const ids = await fetchImageAllographIds(String(manuscriptImage.id));
        if (!isMounted) return;

        setImageAllographIds(ids);
      } catch {
        if (isMounted) setImageAllographIds([]);
      }
    };

    void loadAllographIds();

    return () => {
      isMounted = false;
    };
  }, [manuscriptImage]);

  return {
    manuscriptImage,
    manuscript,
    allographs,
    imageAllographIds,
    hands,
    handsLoaded,
    imageHeight,
    loading,
    error,
    setHands,
    setHandsLoaded,
  };
}
