import { describe, expect, it } from 'vitest';

import type { BackendGraph } from '@/services/annotations';
import {
  activeFilterCount,
  allographGroupComparator,
  applyGraphFilters,
  collectFeatures,
  collectPositions,
  DEFAULT_SORT,
  EMPTY_FILTERS,
  filtersFromParams,
  filtersToQuery,
  type GalleryFilterState,
  isGraphDescribed,
} from './annotation-gallery-filters';

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

describe('isGraphDescribed', () => {
  it('trusts the server is_described flag when present', () => {
    expect(isGraphDescribed(makeGraph({ is_described: true }))).toBe(true);
    expect(isGraphDescribed(makeGraph({ is_described: false }))).toBe(false);
  });

  it('falls back to features/positions when the flag is absent', () => {
    expect(isGraphDescribed(makeGraph({ positions: [3] }))).toBe(true);
    expect(
      isGraphDescribed(makeGraph({ graphcomponent_set: [{ component: 1, features: [5] }] }))
    ).toBe(true);
    expect(
      isGraphDescribed(makeGraph({ graphcomponent_set: [{ component: 1, features: [] }] }))
    ).toBe(false);
  });
});

describe('applyGraphFilters', () => {
  const graphs = [
    makeGraph({
      id: 1,
      hand: 100,
      positions: [3],
      graphcomponent_set: [{ component: 1, features: [5] }],
    }),
    makeGraph({ id: 2, hand: 200, positions: [], graphcomponent_set: [] }),
    makeGraph({
      id: 3,
      hand: null,
      positions: [4],
      graphcomponent_set: [{ component: 1, features: [6] }],
    }),
  ];

  it('returns all graphs with empty filters', () => {
    expect(applyGraphFilters(graphs, EMPTY_FILTERS)).toHaveLength(3);
  });

  it('filters by hand (null = unattributed)', () => {
    expect(applyGraphFilters(graphs, { ...EMPTY_FILTERS, hands: [100] }).map((g) => g.id)).toEqual([
      1,
    ]);
    expect(applyGraphFilters(graphs, { ...EMPTY_FILTERS, hands: [null] }).map((g) => g.id)).toEqual(
      [3]
    );
    expect(
      applyGraphFilters(graphs, { ...EMPTY_FILTERS, hands: [100, 200] }).map((g) => g.id)
    ).toEqual([1, 2]);
  });

  it('filters by description status', () => {
    expect(
      applyGraphFilters(graphs, { ...EMPTY_FILTERS, status: 'undescribed' }).map((g) => g.id)
    ).toEqual([2]);
    expect(
      applyGraphFilters(graphs, { ...EMPTY_FILTERS, status: 'described' }).map((g) => g.id)
    ).toEqual([1, 3]);
  });

  it('filters by feature (graph must have all selected)', () => {
    expect(applyGraphFilters(graphs, { ...EMPTY_FILTERS, features: [5] }).map((g) => g.id)).toEqual(
      [1]
    );
    expect(applyGraphFilters(graphs, { ...EMPTY_FILTERS, features: [5, 6] })).toHaveLength(0);
  });

  it('filters by position', () => {
    expect(
      applyGraphFilters(graphs, { ...EMPTY_FILTERS, positions: [4] }).map((g) => g.id)
    ).toEqual([3]);
  });
});

describe('collectFeatures / collectPositions', () => {
  it('dedupes and names options from graph details', () => {
    const graphs = [
      makeGraph({
        graphcomponent_set: [
          { component: 1, features: [5], feature_details: [{ id: 5, name: 'curved' }] },
        ],
        position_details: [{ id: 3, name: 'initial' }],
        positions: [3],
      }),
      makeGraph({
        graphcomponent_set: [
          { component: 2, features: [5], feature_details: [{ id: 5, name: 'curved' }] },
        ],
      }),
    ];
    expect(collectFeatures(graphs)).toEqual([{ id: 5, name: 'curved' }]);
    expect(collectPositions(graphs)).toEqual([{ id: 3, name: 'initial' }]);
  });
});

describe('allographGroupComparator', () => {
  const a = { allographName: 'a', count: 2 };
  const b = { allographName: 'b', count: 5 };
  it('sorts by name and by count', () => {
    expect([b, a].sort(allographGroupComparator('allograph-asc'))).toEqual([a, b]);
    expect([a, b].sort(allographGroupComparator('allograph-desc'))).toEqual([b, a]);
    expect([a, b].sort(allographGroupComparator('count-desc'))).toEqual([b, a]);
    expect([b, a].sort(allographGroupComparator('count-asc'))).toEqual([a, b]);
  });
});

describe('activeFilterCount', () => {
  it('counts each active constraint', () => {
    expect(activeFilterCount(EMPTY_FILTERS)).toBe(0);
    expect(
      activeFilterCount({
        allograph: 'x',
        hands: [1, 2],
        status: 'described',
        features: [5],
        positions: [],
        sort: DEFAULT_SORT,
      })
    ).toBe(5);
  });
});

describe('URL round-trip', () => {
  it('serializes and parses back to the same state', () => {
    const state: GalleryFilterState = {
      allograph: 'long s',
      hands: [100, null],
      status: 'undescribed',
      features: [5, 6],
      positions: [3],
      sort: 'count-desc',
    };
    const query = filtersToQuery(state);
    const params = new URLSearchParams(query);
    expect(filtersFromParams(params)).toEqual(state);
  });

  it('omits defaults from the query', () => {
    expect(filtersToQuery(EMPTY_FILTERS)).toEqual({});
  });

  it('parses an empty query to empty filters', () => {
    expect(filtersFromParams(new URLSearchParams())).toEqual(EMPTY_FILTERS);
  });
});
