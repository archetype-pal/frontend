import { describe, expect, it } from 'vitest';
import { COLUMN_HEADERS_BY_TYPE, COLUMN_SORT_KEYS_BY_TYPE } from './results-table';
import {
  getColumnLabel,
  getDateFacets,
  SEARCH_RESULT_CONFIG,
  SEARCH_RESULT_TYPES,
} from '@/lib/search-types';

describe('results table column headers', () => {
  it.each(SEARCH_RESULT_TYPES)('%s lists its default visible columns first', (type) => {
    const defaults = [...SEARCH_RESULT_CONFIG[type].defaultVisibleColumns];
    expect(COLUMN_HEADERS_BY_TYPE[type].slice(0, defaults.length)).toEqual(defaults);
  });

  it.each(SEARCH_RESULT_TYPES)('%s names each date column after the date it sorts on', (type) => {
    const names = { manuscript: 'Manuscript Date', hand: 'Hand Date' };
    for (const { field, kind } of getDateFacets(type)) {
      const columns = Object.entries(COLUMN_SORT_KEYS_BY_TYPE[type])
        .filter(([, sortKey]) => sortKey === `${field}_min`)
        .map(([header]) => header);
      for (const header of columns) {
        expect(getColumnLabel(type, header, names)).toBe(names[kind]);
      }
    }
  });
});
