import { describe, expect, it } from 'vitest';
import { COLUMN_FIELD_MAP, buildFormattedCsv, buildFormattedJson } from './search-export';
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

  it('heads the stored hands Date column with Hand Date', () => {
    const csv = buildFormattedCsv(
      'hands',
      [{ name: 'Hand 1', date: 's. xii' }],
      ['Hand Title', 'Date']
    );

    expect(csv).toBe('Hand Title,Hand Date\nHand 1,s. xii');
  });

  it('keys the stored hands Date column as Hand Date in JSON', () => {
    const json = buildFormattedJson(
      'hands',
      [{ name: 'Hand 1', date: 's. xii' }],
      ['Hand Title', 'Date']
    );

    expect(JSON.parse(json)).toEqual([{ 'Hand Title': 'Hand 1', 'Hand Date': 's. xii' }]);
  });

  it('exports the graphs Hand Date column', () => {
    const csv = buildFormattedCsv(
      'graphs',
      [{ hand_name: 'Hand 1', hand_date: 's. xi' }],
      ['Hand Name', 'Hand Date']
    );

    expect(csv).toBe('Hand Name,Hand Date\nHand 1,s. xi');
  });

  it('exports the manuscripts Locus column', () => {
    const csv = buildFormattedCsv(
      'manuscripts',
      [{ shelfmark: 'Cotton Tiberius A.xiii', locus: 'fols. 1–118' }],
      ['Shelfmark', 'Locus']
    );

    expect(csv).toBe('Shelfmark,Locus\nCotton Tiberius A.xiii,fols. 1–118');
  });

  it('exports every description of a manuscript', () => {
    const csv = buildFormattedCsv(
      'manuscripts',
      [{ description: ['Psalter and prayers', 'Gospels'] }],
      ['Description']
    );

    expect(csv).toBe('Description\nPsalter and prayers; Gospels');
  });
});
