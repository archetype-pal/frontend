/**
 * Pure hit-test resolution for the Annotorious canvas, extracted from
 * manuscript-annotorious.tsx so the trickiest selection branch is closure-free
 * and unit-tested.
 *
 * Annotorious hit-tests its OWN store and ignores our CSS, so when shapes
 * overlap the wrong one can be selected:
 *  - a glyph hidden under a region in text view (resolved via the recovery path),
 *  - a small glyph sitting inside a larger linked text region in "Both" view
 *    (the region is the link target the editor meant to click, but the glyph
 *    wins — this was the flaky Link Bar region-selection bug).
 *
 * The component supplies the visible candidate boxes (already filtered for
 * `display:none` and, optionally, by annotation kind); this picks which one the
 * click actually lands on.
 */

export interface HitBox {
  id: string;
  /** Viewport-space rect (getBoundingClientRect output is assignable). */
  left: number;
  right: number;
  top: number;
  bottom: number;
  width: number;
  height: number;
}

/**
 * The smallest candidate box that contains (x, y), or null if none do. Smallest
 * wins so a nested shape (a letter inside a word region) resolves to the tighter
 * box when the caller hasn't already narrowed candidates by kind.
 */
export function smallestBoxContainingPoint(
  candidates: HitBox[],
  x: number,
  y: number
): string | null {
  let bestId: string | null = null;
  let bestArea = Infinity;

  for (const box of candidates) {
    // Skip degenerate boxes: a zero-area box would otherwise win every tie
    // (area 0 < any real area) despite being unclickable.
    if (
      box.width === 0 ||
      box.height === 0 ||
      x < box.left ||
      x > box.right ||
      y < box.top ||
      y > box.bottom
    ) {
      continue;
    }
    const area = box.width * box.height;
    if (area < bestArea) {
      bestArea = area;
      bestId = box.id;
    }
  }

  return bestId;
}
