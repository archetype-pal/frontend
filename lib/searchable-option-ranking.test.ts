import { describe, expect, it } from 'vitest';

import { rankSearchableOptions } from './searchable-option-ranking';

describe('rankSearchableOptions', () => {
  it('prioritizes lowercase prefix matches before uppercase prefix matches', () => {
    const ranked = rankSearchableOptions(
      [
        { value: 'capital-a', label: 'A' },
        { value: 'lower-a-without-head', label: 'a without head' },
        { value: 'lower-a-with-head', label: 'a, with head' },
        { value: 'lower-a', label: 'a' },
      ],
      'a'
    );

    expect(ranked.map((option) => option.value)).toEqual([
      'lower-a',
      'lower-a-with-head',
      'lower-a-without-head',
      'capital-a',
    ]);
  });

  it('prioritizes uppercase prefix matches when the user types uppercase', () => {
    const ranked = rankSearchableOptions(
      [
        { value: 'lower-a', label: 'a' },
        { value: 'capital-a-with-stroke', label: 'A, with stroke' },
        { value: 'capital-a', label: 'A' },
      ],
      'A'
    );

    expect(ranked.map((option) => option.value)).toEqual([
      'capital-a',
      'capital-a-with-stroke',
      'lower-a',
    ]);
  });
});
