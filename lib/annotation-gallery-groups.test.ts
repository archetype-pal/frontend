import { describe, expect, it } from 'vitest';

import type { BackendGraph } from '@/services/annotations';
import type { HandType } from '@/types/hands';
import {
  groupAnnotations,
  handAccentColor,
  handAnchorId,
  NO_ALLOGRAPH_LABEL,
  withUnassignedLast,
} from './annotation-gallery-groups';

function makeGraph(overrides: Partial<BackendGraph> = {}): BackendGraph {
  return {
    id: 1,
    item_image: 1,
    annotation: { type: 'Feature', geometry: { type: 'Polygon', coordinates: [] } },
    allograph: 10,
    hand: 100,
    graphcomponent_set: [],
    positions: [],
    ...overrides,
  } as BackendGraph;
}

function makeHand(overrides: Partial<HandType> = {}): HandType {
  return {
    id: 100,
    name: 'Main Hand',
    scribe: 1,
    item_part: 1,
    date: '',
    place: '',
    descriptions: [],
    ...overrides,
  };
}

const ALLOGRAPHS = [
  { id: 10, name: 'a' },
  { id: 11, name: 'b' },
  { id: 12, name: 'long', character_name: 's' },
];

describe('groupAnnotations', () => {
  it('groups graphs by hand, then by allograph name', () => {
    const groups = groupAnnotations(
      [
        makeGraph({ id: 1, allograph: 11 }),
        makeGraph({ id: 2, allograph: 10 }),
        makeGraph({ id: 3, allograph: 11 }),
      ],
      [makeHand()],
      ALLOGRAPHS
    );

    expect(groups).toHaveLength(1);
    expect(groups[0].handName).toBe('Main Hand');
    expect(groups[0].allographs.map((a) => [a.allographName, a.graphs.map((g) => g.id)])).toEqual([
      ['a', [2]],
      ['b', [1, 3]],
    ]);
  });

  it('labels an allograph with its character', () => {
    const [hand] = groupAnnotations([makeGraph({ allograph: 12 })], [makeHand()], ALLOGRAPHS);
    expect(hand.allographs[0].allographName).toBe('s, long');
  });

  it('orders hands by their priority and puts unattributed graphs last', () => {
    const groups = groupAnnotations(
      [
        makeGraph({ id: 1, hand: null }),
        makeGraph({ id: 2, hand: 200 }),
        makeGraph({ id: 3, hand: 100 }),
      ],
      [makeHand({ id: 100, name: 'Second', num: 2 }), makeHand({ id: 200, name: 'First', num: 1 })],
      ALLOGRAPHS
    );

    expect(groups.map((g) => g.handName)).toEqual(['First', 'Second', 'Unattributed']);
  });

  it('lists graphs that have no allograph in a group of their own, last', () => {
    const [hand] = groupAnnotations(
      [makeGraph({ id: 1, allograph: null }), makeGraph({ id: 2, allograph: 11 })],
      [makeHand()],
      ALLOGRAPHS
    );

    expect(hand.allographs.map((a) => [a.allographId, a.allographName])).toEqual([
      [11, 'b'],
      [null, NO_ALLOGRAPH_LABEL],
    ]);
    expect(hand.allographs[1].graphs.map((g) => g.id)).toEqual([1]);
  });

  it('names the groups that have no record with the labels it is given', () => {
    const groups = groupAnnotations(
      [
        makeGraph({ id: 1, hand: null, allograph: null }),
        makeGraph({ id: 2, hand: 7, allograph: 99 }),
      ],
      [],
      [],
      {
        unattributed: 'Nicht zugeordnet',
        noAllograph: 'Kein Allograph',
        hand: (id) => `Hand Nr. ${id}`,
        allograph: (id) => `Allograph Nr. ${id}`,
      }
    );

    expect(groups.map((h) => [h.handName, h.allographs.map((a) => a.allographName)])).toEqual([
      ['Hand Nr. 7', ['Allograph Nr. 99']],
      ['Nicht zugeordnet', ['Kein Allograph']],
    ]);
  });

  it('falls back to ids when the hand or allograph names did not load', () => {
    const [hand] = groupAnnotations([makeGraph({ hand: 7, allograph: 99 })], [], []);
    expect(hand.handName).toBe('Hand 7');
    expect(hand.allographs[0].allographName).toBe('Allograph 99');
  });
});

describe('withUnassignedLast', () => {
  it('keeps the no-allograph group last under any sort', () => {
    const groups = [{ allographId: null }, { allographId: 2 }, { allographId: 1 }];
    const descending = withUnassignedLast<{ allographId: number | null }>(
      (a, b) => (b.allographId ?? 0) - (a.allographId ?? 0)
    );
    expect([...groups].sort(descending).map((g) => g.allographId)).toEqual([2, 1, null]);
  });
});

describe('hand anchors and accents', () => {
  it('gives every hand, unattributed included, its own anchor', () => {
    expect(handAnchorId(5)).toBe('hand-5');
    expect(handAnchorId(null)).toBe('hand-unattributed');
  });

  it('keeps unattributed graphs grey and cycles the palette for hands', () => {
    expect(handAccentColor(null, 0)).toBe('#94a3b8');
    expect(handAccentColor(1, 0)).toBe(handAccentColor(2, 8));
    expect(handAccentColor(1, 0)).not.toBe(handAccentColor(2, 1));
  });
});
