import { describe, expect, it } from 'vitest';
import { SEARCH_RESULT_CONFIG, SEARCH_RESULT_TYPES, resultTypeItems } from './search-types';

describe('search type metadata', () => {
  it('defines canonical metadata for every result type', () => {
    expect(resultTypeItems.map((item) => item.value).sort()).toEqual(
      [...SEARCH_RESULT_TYPES].sort()
    );
  });

  it('derives toggle items from canonical labels', () => {
    expect(resultTypeItems).toEqual(
      SEARCH_RESULT_TYPES.map((value) => ({
        value,
        label: SEARCH_RESULT_CONFIG[value].label,
      }))
    );
  });

  it('derives default visible columns from canonical metadata', () => {
    for (const type of SEARCH_RESULT_TYPES) {
      expect(SEARCH_RESULT_CONFIG[type].defaultVisibleColumns.length).toBeGreaterThan(0);
    }
  });
});
