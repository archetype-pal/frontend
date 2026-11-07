import { describe, expect, it } from 'vitest';

import { addSuggestionToRecord } from './use-shape-assist';
import type { ShapeSuggestion } from '@/types/glyph-assist';

const answer = (overrides: Partial<ShapeSuggestion>): ShapeSuggestion => ({
  id: 1,
  allograph: 9,
  allograph_label: 'a',
  hand: null,
  confidence: 0.8,
  components: [],
  positions: [],
  reasoning: '',
  alternatives: [],
  problem: '',
  model_name: 'm',
  ...overrides,
});

const positions = new Map([
  [1, 'Initial'],
  [2, 'Medial'],
]);

const recorded = {
  components: [
    {
      component: 5,
      componentName: 'Stem',
      features: [50],
      featureDetails: [{ id: 50, name: 'straight' }],
    },
  ],
  positions: [1],
};

describe('addSuggestionToRecord', () => {
  it('adds what the model saw and removes nothing recorded', () => {
    const merged = addSuggestionToRecord(
      recorded,
      answer({
        components: [
          {
            component: 5,
            component_name: 'Stem',
            features: [51],
            feature_details: [{ id: 51, name: 'forked' }],
          },
          {
            component: 6,
            component_name: 'Bowl',
            features: [60],
            feature_details: [{ id: 60, name: 'closed' }],
          },
        ],
        positions: [2],
      }),
      positions
    );

    expect(merged.components.map((row) => [row.component, row.features])).toEqual([
      [5, [50, 51]],
      [6, [60]],
    ]);
    expect(merged.positions).toEqual([1, 2]);
    expect(merged.comparison?.added).toEqual(['Stem: forked', 'Bowl: closed', 'Medial']);
    expect(merged.comparison?.notSeen).toEqual(['Stem: straight', 'Initial']);
  });

  it('reports nothing to add when the model saw only what is recorded', () => {
    const merged = addSuggestionToRecord(
      recorded,
      answer({
        components: [
          {
            component: 5,
            component_name: 'Stem',
            features: [50],
            feature_details: [{ id: 50, name: 'straight' }],
          },
        ],
        positions: [1],
      }),
      positions
    );

    expect(merged.comparison?.added).toEqual([]);
    expect(merged.comparison?.notSeen).toEqual([]);
  });

  it('keeps what was first in the fields, for asking again to start from', () => {
    const merged = addSuggestionToRecord(recorded, answer({}), positions);

    expect(merged.comparison?.base).toBe(recorded);
  });
});
