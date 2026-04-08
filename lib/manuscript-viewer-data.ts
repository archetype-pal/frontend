import { getIiifBaseUrl } from '@/utils/iiif';
import { fetchAllographs, fetchManuscript, fetchManuscriptImage } from '@/services/manuscripts';
import { fetchAnnotationsForImage } from '@/services/annotations';

import type { Allograph } from '@/types/allographs';
import type { Manuscript } from '@/types/manuscript';
import type { ManuscriptImage as ManuscriptImageType } from '@/types/manuscript-image';

import { browserSafeIiifUrl } from '@/lib/annotation-popup-utils';

export async function fetchIiifImageHeight(iiifImage: string): Promise<number> {
  const baseUrl = browserSafeIiifUrl(getIiifBaseUrl(iiifImage));
  const infoUrl = `${baseUrl}/info.json`;

  try {
    const infoRes = await fetch(infoUrl);
    if (!infoRes.ok) throw new Error(`IIIF info: ${infoRes.status}`);

    const info = await infoRes.json();
    return info.height ?? 2000;
  } catch {
    return 2000;
  }
}

export async function fetchImageAllographIds(itemImageId: string): Promise<number[]> {
  const graphs = await fetchAnnotationsForImage(itemImageId);

  return Array.from(
    new Set(
      graphs.map((graph) => graph.allograph).filter((id): id is number => typeof id === 'number')
    )
  );
}

export async function fetchManuscriptViewerBaseData(imageId: string): Promise<{
  image: ManuscriptImageType;
  manuscript: Manuscript | null;
  allographs: Allograph[];
  imageHeight: number;
}> {
  const [image, allographs] = await Promise.all([fetchManuscriptImage(imageId), fetchAllographs()]);

  const [manuscript, imageHeight] = await Promise.all([
    fetchManuscript(image.item_part).catch(() => null),
    fetchIiifImageHeight(image.iiif_image),
  ]);

  return {
    image,
    manuscript,
    allographs,
    imageHeight,
  };
}
