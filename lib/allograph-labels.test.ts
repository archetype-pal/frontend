import { describe, expect, it } from 'vitest';

import { formatAllographLabel } from './allograph-labels';

describe('formatAllographLabel', () => {
  it('displays the character and allograph when they differ', () => {
    expect(formatAllographLabel({ character_name: 'a', name: 'double-compartment a' })).toBe(
      'a, double-compartment a'
    );
  });

  it('displays only the character when names match', () => {
    expect(formatAllographLabel({ character_name: 'a', name: 'a' })).toBe('a');
  });

  it('falls back to the allograph name without character data', () => {
    expect(formatAllographLabel({ name: 'long s' })).toBe('long s');
  });
});
