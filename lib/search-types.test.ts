import { describe, expect, it } from 'vitest';
import {
  getColumnLabel,
  getDateFacets,
  getDateSortNames,
  getDefaultVisibleFacets,
  getFacetOrder,
  getFacetRenderMap,
  SEARCH_RESULT_CONFIG,
  SEARCH_RESULT_TYPES,
  resultTypeItems,
} from './search-types';

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

  it('whitelists the msDesc-derived manuscript facets as checkboxes', () => {
    const renderMap = getFacetRenderMap('manuscripts');
    for (const key of [
      'script',
      'material',
      'deco_type',
      'seal_type',
      'seal_material',
      'origin_place',
    ]) {
      expect(renderMap[key]).toBe('checkbox');
    }
  });

  it('derives facet order and render map from facet descriptors', () => {
    for (const type of SEARCH_RESULT_TYPES) {
      const facets = SEARCH_RESULT_CONFIG[type].facets;
      expect(getFacetOrder(type)).toEqual(facets.map((facet) => facet.key));
      expect(getFacetRenderMap(type)).toEqual(
        Object.fromEntries(facets.map((facet) => [facet.key, facet.render]))
      );
    }
  });
});

const DATE_NAMES = { manuscript: 'Manuscript Date', hand: 'Hand Date' };

describe('getColumnLabel', () => {
  it.each([
    ['manuscripts', 'Text Date'],
    ['images', 'Date'],
    ['graphs', 'Document Date'],
    ['texts', 'MS Date'],
    ['hands', 'Text Date'],
  ] as const)('names the %s manuscript date column after the site', (type, column) => {
    expect(getColumnLabel(type, column, DATE_NAMES)).toBe('Manuscript Date');
  });

  it('names the hand date the same on Hands and Graphs', () => {
    expect(getColumnLabel('hands', 'Date', DATE_NAMES)).toBe('Hand Date');
    expect(getColumnLabel('graphs', 'Hand Date', DATE_NAMES)).toBe('Hand Date');
  });

  it('names the scribe date after the scribe', () => {
    expect(getColumnLabel('scribes', 'Date', DATE_NAMES)).toBe('Scribe Date');
  });

  it('shows every other column under its own name', () => {
    expect(getColumnLabel('texts', 'Shelfmark', DATE_NAMES)).toBe('Shelfmark');
  });
});

describe('getDateSortNames', () => {
  it('names both bounds of each date a tab can sort on', () => {
    expect(getDateSortNames('graphs', DATE_NAMES)).toEqual({
      date_min: 'Manuscript Date',
      date_max: 'Manuscript Date',
      hand_date_min: 'Hand Date',
      hand_date_max: 'Hand Date',
    });
    expect(getDateSortNames('hands', DATE_NAMES).date_min).toBe('Hand Date');
  });
});

describe('date facets', () => {
  it('gives hands and graphs a second date beside the first', () => {
    expect(getDateFacets('hands')).toEqual([
      { key: 'text_date', field: 'date', kind: 'hand' },
      { key: 'manuscript_date', field: 'manuscript_date', kind: 'manuscript' },
    ]);
    expect(getDateFacets('graphs')).toEqual([
      { key: 'text_date', field: 'date', kind: 'manuscript' },
      { key: 'hand_date', field: 'hand_date', kind: 'hand' },
    ]);
  });

  it('leaves the added date facets off until a site turns them on', () => {
    expect(getDefaultVisibleFacets('hands')).not.toContain('manuscript_date');
    expect(getDefaultVisibleFacets('graphs')).not.toContain('text_date');
    expect(getDefaultVisibleFacets('graphs')).not.toContain('hand_date');
    expect(getDefaultVisibleFacets('manuscripts')).toEqual([...getFacetOrder('manuscripts')]);
  });
});
