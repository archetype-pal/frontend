import { describe, expect, it } from 'vitest';

import type { BackendGraph } from '@/services/annotations';
import type { HandType } from '@/types/hands';
import { groupAnnotations, handAccentColor, handAnchorId } from './annotation-gallery-groups';

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

  it('falls back to ids when the hand or allograph names did not load', () => {
    const [hand] = groupAnnotations([makeGraph({ hand: 7, allograph: 99 })], [], []);
    expect(hand.handName).toBe('Hand 7');
    expect(hand.allographs[0].allographName).toBe('Allograph 99');
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
