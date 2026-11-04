import { describe, expect, it } from 'vitest';

import { mergedFieldOptions } from './query-builder-fields';

describe('mergedFieldOptions', () => {
  it('lets the query builder filter texts by their approved charter roles', () => {
    expect(mergedFieldOptions('texts')).toEqual(
      expect.arrayContaining(['granters', 'beneficiaries', 'witnesses'])
    );
  });

  // Only the texts index carries them; a clause or a mention document does not.
  it('offers the roles on no other result type', () => {
    for (const type of ['clauses', 'people', 'places', 'manuscripts'] as const) {
      expect(mergedFieldOptions(type)).not.toContain('witnesses');
    }
  });
});
