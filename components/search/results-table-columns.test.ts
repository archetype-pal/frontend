import { describe, expect, it } from 'vitest';
import { COLUMN_HEADERS_BY_TYPE } from './results-table';
import { SEARCH_RESULT_CONFIG, SEARCH_RESULT_TYPES } from '@/lib/search-types';

describe('results table column headers', () => {
  it.each(SEARCH_RESULT_TYPES)('%s lists its default visible columns first', (type) => {
    const defaults = [...SEARCH_RESULT_CONFIG[type].defaultVisibleColumns];
    expect(COLUMN_HEADERS_BY_TYPE[type].slice(0, defaults.length)).toEqual(defaults);
  });
});
