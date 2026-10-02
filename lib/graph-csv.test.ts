import { describe, expect, it } from 'vitest';

import type { BackendGraph } from '@/services/annotations';
import { graphsToCsv } from './graph-csv';

const graph = {
  id: 7,
  item_image: 1,
  annotation: { type: 'Feature', geometry: { type: 'Polygon', coordinates: [] } },
  allograph: 3,
  hand: 2,
  graphcomponent_set: [
    {
      component: 4,
      component_name: 'bowl',
      features: [9],
      feature_details: [{ id: 9, name: 'round' }],
    },
    { component: 5, features: [] },
  ],
  positions: [1],
  position_details: [{ id: 1, name: 'initial' }],
} as BackendGraph;

describe('graphsToCsv', () => {
  it('writes the shared graph columns, then the extra ones', () => {
    const csv = graphsToCsv(
      [{ graph, allograph: 'a, Insular', hand: 'Main Hand', locus: 'dorse' }],
      [{ header: 'locus', value: (r) => r.locus }]
    );

    expect(csv).toBe(
      'id,allograph,hand,described,components,features,positions,locus\n' +
        '7,"a, Insular",Main Hand,yes,bowl; #5,round,initial,dorse'
    );
  });

  it('writes only the header when there are no rows', () => {
    expect(graphsToCsv([])).toBe('id,allograph,hand,described,components,features,positions');
  });
});
