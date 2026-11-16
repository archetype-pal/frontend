import { describe, expect, it } from 'vitest';
import { COLUMN_FIELD_MAP, buildFormattedCsv, buildFormattedJson } from './search-export';
import { SEARCH_RESULT_TYPES } from './search-types';

const DATE_NAMES = { manuscript: 'Manuscript Date', hand: 'Hand Date' };
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
      ['Repository', 'Shelfmark'],
      DATE_NAMES
    );

    expect(csv).toBe('Repository,Shelfmark\n"\'=HYPERLINK(""http://x"")","MS 1, f. 2"');
  });

  it('heads a column with the name the table shows', () => {
    const csv = buildFormattedCsv('texts', [{ date: '1100' }], ['MS Date'], DATE_NAMES);

    expect(csv).toBe('Manuscript Date\n1100');
  });
});

describe('buildFormattedJson', () => {
  it('keys a column by the name the table shows', () => {
    const json = buildFormattedJson('graphs', [{ date: '1100' }], ['Document Date'], DATE_NAMES);

    expect(JSON.parse(json)).toEqual([{ 'Manuscript Date': '1100' }]);
  });

  it('exports the second date of a hand and of a graph', () => {
    const hands = buildFormattedJson(
      'hands',
      [{ date: 's. xii', manuscript_date: '1165 x 1171' }],
      ['Date', 'Text Date'],
      DATE_NAMES
    );
    const graphs = buildFormattedJson(
      'graphs',
      [{ hand_date: 's. xi' }],
      ['Hand Date'],
      DATE_NAMES
    );

    expect(JSON.parse(hands)).toEqual([
      { 'Hand Date': 's. xii', 'Manuscript Date': '1165 x 1171' },
    ]);
    expect(JSON.parse(graphs)).toEqual([{ 'Hand Date': 's. xi' }]);
  });
});
