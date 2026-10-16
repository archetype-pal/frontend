import { describe, expect, it } from 'vitest';
import { COLUMN_FIELD_MAP, buildFormattedCsv } from './search-export';
import { SEARCH_RESULT_TYPES } from './search-types';
import { COLUMN_HEADERS_BY_TYPE } from '@/components/search/results-table';

describe('export column field map', () => {
  // Guards the drift that produced the dead "Category Number" column: the export
  // map kept naming a header the table no longer defined, so CSV and table
  // silently disagreed about what that column meant.
  it('only names headers that exist as table columns', () => {
    for (const type of SEARCH_RESULT_TYPES) {
      for (const header of Object.keys(COLUMN_FIELD_MAP[type])) {
        expect(COLUMN_HEADERS_BY_TYPE[type]).toContain(header);
      }
    }
  });
});

describe('buildFormattedCsv', () => {
  it('neutralises cells that a spreadsheet would run as a formula', () => {
    const csv = buildFormattedCsv(
      'manuscripts',
      [{ repository_name: '=HYPERLINK("http://x")', shelfmark: 'MS 1, f. 2' }],
      ['Repository', 'Shelfmark']
    );

    expect(csv).toBe('Repository,Shelfmark\n"\'=HYPERLINK(""http://x"")","MS 1, f. 2"');
  });
});
