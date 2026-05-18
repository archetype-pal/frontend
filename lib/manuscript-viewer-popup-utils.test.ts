import { describe, expect, it } from 'vitest';

import { buildPositionDetails } from './manuscript-viewer-popup-utils';

describe('buildPositionDetails', () => {
  it('looks up names from the map when present', () => {
    const lookup = new Map<number, string>([
      [1, 'Initial'],
      [2, 'Medial'],
    ]);
    expect(buildPositionDetails([1, 2], lookup)).toEqual([
      { id: 1, name: 'Initial' },
      { id: 2, name: 'Medial' },
    ]);
  });

  it('falls back to "Position {id}" when the id is missing from the lookup', () => {
    // Regression: reassigning an allograph swaps positionNameById to a
    // different set. Without the fallback, positions from the previous
    // allograph silently disappear from positionDetails, even though the
    // backend keeps the id list intact.
    const lookup = new Map<number, string>([[1, 'Initial']]);
    expect(buildPositionDetails([1, 7, 99], lookup)).toEqual([
      { id: 1, name: 'Initial' },
      { id: 7, name: 'Position 7' },
      { id: 99, name: 'Position 99' },
    ]);
  });

  it('returns an empty array for an empty input', () => {
    expect(buildPositionDetails([], new Map())).toEqual([]);
  });

  it('preserves the order of the input ids', () => {
    const lookup = new Map<number, string>([
      [1, 'A'],
      [2, 'B'],
      [3, 'C'],
    ]);
    expect(buildPositionDetails([3, 1, 2], lookup).map((p) => p.id)).toEqual([3, 1, 2]);
  });
});
