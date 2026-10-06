import { describe, expect, it } from 'vitest';

import { toOrdering } from './ordering';

describe('toOrdering', () => {
  const fields = { name: 'first_name,last_name', scribe_name: 'scribe__name' };

  it('returns undefined when nothing is sorted', () => {
    expect(toOrdering([], fields)).toBeUndefined();
  });

  it('maps a column to its backend field and direction', () => {
    expect(toOrdering([{ id: 'scribe_name', desc: false }], fields)).toBe('scribe__name');
    expect(toOrdering([{ id: 'scribe_name', desc: true }], fields)).toBe('-scribe__name');
  });

  it('expands a column onto several fields', () => {
    expect(toOrdering([{ id: 'name', desc: true }], fields)).toBe('-first_name,-last_name');
  });

  it('ignores columns the backend cannot sort', () => {
    expect(toOrdering([{ id: 'actions', desc: false }], fields)).toBeUndefined();
  });
});
