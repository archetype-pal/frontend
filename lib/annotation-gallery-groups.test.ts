import { describe, expect, it } from 'vitest';

import type { BackendGraph } from '@/services/annotations';
import type { HandType } from '@/types/hands';
import { EMPTY_FILTERS } from './annotation-gallery-filters';
import {
  type GroupLabels,
  filterAndGroup,
  groupAnnotations,
  handAccentColor,
  handAnchorId,
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

const LABELS: GroupLabels = {
  unattributed: 'Unattributed',
  noAllograph: 'No allograph',
  hand: (id) => `Hand ${id}`,
  allograph: (id) => `Allograph ${id}`,
};

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
      ALLOGRAPHS,
      LABELS
    );

    expect(groups).toHaveLength(1);
    expect(groups[0].handName).toBe('Main Hand');
    expect(groups[0].allographs.map((a) => [a.allographName, a.graphs.map((g) => g.id)])).toEqual([
      ['a', [2]],
      ['b', [1, 3]],
    ]);
  });

  it('labels an allograph with its character', () => {
    const [hand] = groupAnnotations(
      [makeGraph({ allograph: 12 })],
      [makeHand()],
      ALLOGRAPHS,
      LABELS
    );
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
      ALLOGRAPHS,
      LABELS
    );

    expect(groups.map((g) => g.handName)).toEqual(['First', 'Second', 'Unattributed']);
  });

  it('lists graphs that have no allograph in a group of their own, last', () => {
    const [hand] = groupAnnotations(
      [makeGraph({ id: 1, allograph: null }), makeGraph({ id: 2, allograph: 11 })],
      [makeHand()],
      ALLOGRAPHS,
      LABELS
    );

    expect(hand.allographs.map((a) => [a.allographId, a.allographName])).toEqual([
      [11, 'b'],
      [null, 'No allograph'],
    ]);
    expect(hand.allographs[1].graphs.map((g) => g.id)).toEqual([1]);
  });

  it('names hands and allographs it has no record of from the labels it is given', () => {
    const groups = groupAnnotations(
      [
        makeGraph({ id: 1, hand: null, allograph: null }),
        makeGraph({ id: 2, hand: 7, allograph: 99 }),
      ],
      [],
      [],
      LABELS
    );

    expect(groups.map((h) => [h.handName, h.allographs.map((a) => a.allographName)])).toEqual([
      ['Hand 7', ['Allograph 99']],
      ['Unattributed', ['No allograph']],
    ]);
  });

  it('keeps the no-allograph group last under any sort', () => {
    const [hand] = groupAnnotations(
      [
        makeGraph({ id: 1, allograph: null }),
        makeGraph({ id: 2, allograph: null }),
        makeGraph({ id: 3, allograph: 10 }),
      ],
      [makeHand()],
      ALLOGRAPHS,
      LABELS,
      'count-desc'
    );

    expect(hand.allographs.map((a) => a.allographId)).toEqual([10, null]);
  });
});

describe('filterAndGroup', () => {
  const graphs = [
    makeGraph({ id: 1, allograph: 10, is_described: true }),
    makeGraph({ id: 2, allograph: 11 }),
    makeGraph({ id: 3, allograph: 11 }),
    makeGraph({ id: 4, allograph: 12, hand: 200 }),
  ];
  const hands = [makeHand(), makeHand({ id: 200, name: 'Second Hand' })];
  const shown = (filters: Partial<typeof EMPTY_FILTERS>) =>
    filterAndGroup(graphs, { ...EMPTY_FILTERS, ...filters }, hands, ALLOGRAPHS, LABELS).map((h) => [
      h.handName,
      h.allographs.map((a) => [a.allographName, a.graphs.map((g) => g.id)]),
    ]);

  it('applies the graph filters before grouping', () => {
    expect(shown({ status: 'undescribed' })).toEqual([
      ['Main Hand', [['b', [2, 3]]]],
      ['Second Hand', [['s, long', [4]]]],
    ]);
  });

  it('sorts the allograph groups in the chosen sort', () => {
    expect(shown({ sort: 'count-desc', hands: [100] })).toEqual([
      [
        'Main Hand',
        [
          ['b', [2, 3]],
          ['a', [1]],
        ],
      ],
    ]);
  });

  it('matches the allograph name search anywhere in the label, and drops emptied hands', () => {
    expect(shown({ allograph: 'LON' })).toEqual([['Second Hand', [['s, long', [4]]]]]);
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
