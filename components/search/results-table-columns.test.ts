import { describe, expect, it } from 'vitest';
import { COLUMN_HEADERS_BY_TYPE } from './results-table';
import { SEARCH_RESULT_CONFIG, SEARCH_RESULT_TYPES } from '@/lib/search-types';

describe('results table column headers', () => {
  it('stay aligned with default visible columns by result type', () => {
    for (const type of SEARCH_RESULT_TYPES) {
      expect(COLUMN_HEADERS_BY_TYPE[type]).toEqual([
        ...SEARCH_RESULT_CONFIG[type].defaultVisibleColumns,
      ]);
    }
  });
});
