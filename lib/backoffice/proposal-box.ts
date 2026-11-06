/**
 * The geometry of correcting a proposed box.
 *
 * Proposals are stored as graphs are: a GeoJSON ring in the page's pixels with
 * the origin at the bottom left. The editor works in the top-left origin that
 * images and IIIF regions use, so a box is flipped once on the way in and once
 * on the way out.
 */

import { coordinatesFromGeoJson, type IIIFCoordinates } from '@/utils/iiif';

/** A box in the page's pixels, top-left origin. */
export type PageBox = IIIFCoordinates;

/** Which part of the box a drag holds: its body, an edge or a corner. */
export type BoxHandle = 'move' | 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

/** The smallest box the editor lets a drag make, in page pixels. */
export const MIN_SIDE = 4;

/** Margin round the box in the editor, as a multiple of its longer side: room to grow it. */
const MARGIN = 1.5;

export function boxFromAnnotation(
  annotation: Record<string, unknown>,
  pageHeight: number
): PageBox | null {
  const bbox = coordinatesFromGeoJson(JSON.stringify(annotation));
  if (!bbox || bbox.w <= 0 || bbox.h <= 0) return null;
  return { x: bbox.x, y: pageHeight - bbox.y - bbox.h, w: bbox.w, h: bbox.h };
}

/** The box as the platform stores it: a closed, Y-up ring of whole pixels. */
export function annotationFromBox(box: PageBox, pageHeight: number): Record<string, unknown> {
  const left = Math.round(box.x);
  const right = Math.round(box.x + box.w);
  const lower = Math.round(pageHeight - (box.y + box.h));
  const upper = Math.round(pageHeight - box.y);
  return {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'Polygon',
      coordinates: [
        [
          [left, lower],
          [right, lower],
          [right, upper],
          [left, upper],
          [left, lower],
        ],
      ],
    },
  };
}

/** The part of the page the editor shows: the box with a wide margin, clamped to the page. */
export function editorRegion(box: PageBox, page: { width: number; height: number }): PageBox {
  const margin = Math.max(box.w, box.h) * MARGIN;
  const x0 = Math.max(0, Math.floor(box.x - margin));
  const y0 = Math.max(0, Math.floor(box.y - margin));
  const x1 = Math.min(page.width, Math.ceil(box.x + box.w + margin));
  const y1 = Math.min(page.height, Math.ceil(box.y + box.h + margin));
  return { x: x0, y: y0, w: Math.max(0, x1 - x0), h: Math.max(0, y1 - y0) };
}

/**
 * The box after a drag of `handle` by (dx, dy) page pixels.
 *
 * Moving keeps the box's size and stops it at the region's edge; resizing
 * moves only the edges the handle holds, never past the opposite edge (less
 * MIN_SIDE) or out of the region.
 */
export function dragBox(
  start: PageBox,
  handle: BoxHandle,
  dx: number,
  dy: number,
  region: PageBox
): PageBox {
  const regionRight = region.x + region.w;
  const regionBottom = region.y + region.h;
  if (handle === 'move') {
    const x = Math.min(Math.max(start.x + dx, region.x), regionRight - start.w);
    const y = Math.min(Math.max(start.y + dy, region.y), regionBottom - start.h);
    return { x, y, w: start.w, h: start.h };
  }

  let left = start.x;
  let top = start.y;
  let right = start.x + start.w;
  let bottom = start.y + start.h;
  if (handle.includes('w')) left = Math.min(Math.max(left + dx, region.x), right - MIN_SIDE);
  if (handle.includes('e')) right = Math.max(Math.min(right + dx, regionRight), left + MIN_SIDE);
  if (handle.includes('n')) top = Math.min(Math.max(top + dy, region.y), bottom - MIN_SIDE);
  if (handle.includes('s')) bottom = Math.max(Math.min(bottom + dy, regionBottom), top + MIN_SIDE);
  return { x: left, y: top, w: right - left, h: bottom - top };
}

/** Whether two boxes are the same in whole pixels, as they would be stored. */
export function sameBox(a: PageBox, b: PageBox): boolean {
  const round = (box: PageBox) =>
    [box.x, box.y, box.x + box.w, box.y + box.h].map((v) => Math.round(v)).join(',');
  return round(a) === round(b);
}
