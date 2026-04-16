import { describe, expect, it } from 'vitest';
import { COLUMN_HEADERS_BY_TYPE } from './results-table';
import { SEARCH_RESULT_CONFIG, SEARCH_RESULT_TYPES } from '@/lib/search-types';

describe('results table column headers', () => {
  it('default visible columns are a subset of all column headers', () => {
    for (const type of SEARCH_RESULT_TYPES) {
      const allHeaders = COLUMN_HEADERS_BY_TYPE[type];
      const defaults = [...SEARCH_RESULT_CONFIG[type].defaultVisibleColumns];
      for (const col of defaults) {
        expect(allHeaders).toContain(col);
      }
    }
  });

  it('default visible columns appear at the start of column headers', () => {
    for (const type of SEARCH_RESULT_TYPES) {
      const allHeaders = COLUMN_HEADERS_BY_TYPE[type];
      const defaults = [...SEARCH_RESULT_CONFIG[type].defaultVisibleColumns];
      expect(allHeaders.slice(0, defaults.length)).toEqual(defaults);
    }
  });
});
