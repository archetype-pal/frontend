/**
 * Where a proposed box sits within a crop of the page around it.
 *
 * A reviewer decides two things about a machine-drawn box: is that the letter
 * it claims, and does the box hold all of it? A crop of the box alone answers
 * only the first, because a stroke the box cuts off is simply not in the
 * picture. So the queue crops a margin around the box and outlines the box on
 * top of it.
 */

import type { IIIFCoordinates } from '@/utils/iiif';

export interface ProposalCrop {
  /** The IIIF region to request, top-left origin, clamped to the page. */
  region: IIIFCoordinates;
  /** The proposed box within that region, as percentages of the region. */
  box: { left: number; top: number; width: number; height: number };
}

/** Margin on each side, as a multiple of the box's longer side. */
const MARGIN = 0.75;

/**
 * @param bbox The box from `coordinatesFromGeoJson`: bottom-left origin (Y-up),
 *   as graphs and proposals are stored, so `y` is the box's *lower* edge.
 * @param page The page's pixel size from its info.json; the flip needs it.
 */
export function proposalCrop(
  bbox: IIIFCoordinates,
  page: { width: number; height: number }
): ProposalCrop | null {
  if (bbox.w <= 0 || bbox.h <= 0 || page.width <= 0 || page.height <= 0) return null;

  // Flip to the top-left origin IIIF regions use.
  const left = bbox.x;
  const top = page.height - bbox.y - bbox.h;

  const margin = Math.max(bbox.w, bbox.h) * MARGIN;
  const x0 = Math.max(0, Math.floor(left - margin));
  const y0 = Math.max(0, Math.floor(top - margin));
  const x1 = Math.min(page.width, Math.ceil(left + bbox.w + margin));
  const y1 = Math.min(page.height, Math.ceil(top + bbox.h + margin));
  if (x1 <= x0 || y1 <= y0) return null;

  const w = x1 - x0;
  const h = y1 - y0;
  return {
    region: { x: x0, y: y0, w, h },
    box: {
      left: ((left - x0) / w) * 100,
      top: ((top - y0) / h) * 100,
      width: (bbox.w / w) * 100,
      height: (bbox.h / h) * 100,
    },
  };
}
