import { describe, expect, it } from 'vitest';
import {
  buildActiveQueryTags,
  buildDateFilterTag,
  buildQueryString,
  normalizeQueryState,
  resolveFacetClick,
  stateFromSearchParams,
} from './search-query';
import type { QueryState } from './search-query';

describe('buildActiveQueryTags', () => {
  it('builds keyword, date, and facet tags in expected order', () => {
    const tags = buildActiveQueryTags({
      submittedKeyword: '  DCD   Misc  ',
      dateParams: { min_date: '1100', max_date: '1200' },
      selectedFacets: ['repository_name_exact:Durham'],
      searchType: 'manuscripts',
    });

    expect(tags.map((t) => t.label)).toEqual([
      'Keyword: DCD Misc',
      'Date: 1100 - 1200',
      'Repository: Durham',
    ]);
  });
});

describe('search-query utilities', () => {
  it('normalizes selected facets, ordering, and date params', () => {
    const normalized = normalizeQueryState({
      limit: 20,
      offset: 0,
      ordering: ' repository_name_exact ',
      selected_facets: [
        ' type_exact:Charter ',
        '',
        'type_exact:Charter',
        'repository_name_exact:Durham',
      ],
      dateParams: { min_date: ' 1100 ', max_date: ' ', at_most_or_least: '', date_diff: ' 20 ' },
    });

    expect(normalized.selected_facets).toEqual([
      'repository_name_exact:Durham',
      'type_exact:Charter',
    ]);
    expect(normalized.ordering).toBe('repository_name_exact');
    expect(normalized.dateParams).toEqual({ min_date: '1100', date_diff: '20' });
  });

  it('builds a stable query string from normalized state', () => {
    const query = buildQueryString({
      limit: 20,
      offset: 0,
      ordering: ' repository_name_exact ',
      selected_facets: ['type_exact:Charter', 'repository_name_exact:Durham', 'type_exact:Charter'],
      dateParams: { min_date: '1100', max_date: '1200' },
    });
    expect(query).toBe(
      'selected_facets=repository_name_exact%3ADurham&selected_facets=type_exact%3ACharter&limit=20&offset=0&ordering=repository_name_exact&min_date=1100&max_date=1200'
    );
  });

  it('parses search params with defaults', () => {
    const params = new URLSearchParams('selected_facets=type_exact%3ACharter&limit=50');
    const state = stateFromSearchParams(params);
    expect(state).toEqual({
      selected_facets: ['type_exact:Charter'],
      limit: 50,
      offset: 0,
      ordering: null,
      dateParams: {},
      extraParams: {},
    });
  });

  it('builds date tag with precision', () => {
    const tag = buildDateFilterTag({
      min_date: '1100',
      max_date: '1200',
      at_most_or_least: 'at most',
      date_diff: '15',
    });
    expect(tag?.label).toBe('Date: 1100 - 1200, at most 15');
  });
});

describe('resolveFacetClick', () => {
  const BASE_STATE: QueryState = {
    limit: 20,
    offset: 20,
    ordering: null,
    selected_facets: ['repository_name_exact:Durham', 'type_exact:Charter'],
    dateParams: {},
  };

  it('prioritizes deselect over keyword fallback when arg is empty', () => {
    const result = resolveFacetClick({
      arg: '',
      action: { type: 'deselectFacet', facetKey: 'repository_name', value: 'Durham' },
      queryState: BASE_STATE,
      baseFacetURL: 'http://localhost:8000/api/v1/search/item-parts/facets',
    });

    expect(result.type).toBe('query');
    if (result.type !== 'query') return;
    expect(result.value.selected_facets).toEqual(['type_exact:Charter']);
    expect(result.value.offset).toBe(0);
  });

  it('applies merge date params and resets offset', () => {
    const result = resolveFacetClick({
      arg: 'http://localhost:8000/api/v1/search/item-parts/facets?min_date=1100&max_date=1200',
      action: { type: 'mergeDateParams' },
      queryState: BASE_STATE,
      baseFacetURL: 'http://localhost:8000/api/v1/search/item-parts/facets',
    });

    expect(result.type).toBe('query');
    if (result.type !== 'query') return;
    expect(result.value.dateParams).toEqual({ min_date: '1100', max_date: '1200' });
    expect(result.value.offset).toBe(0);
  });

  it('replaces previously selected value for the same facet key', () => {
    const result = resolveFacetClick({
      arg: '/unused',
      action: { type: 'selectFacet', facetKey: 'repository_name', value: 'St Andrews' },
      queryState: BASE_STATE,
      baseFacetURL: 'http://localhost:8000/api/v1/search/item-parts/facets',
    });

    expect(result.type).toBe('query');
    if (result.type !== 'query') return;
    expect(result.value.selected_facets).toEqual([
      'type_exact:Charter',
      'repository_name_exact:St Andrews',
    ]);
    expect(result.value.offset).toBe(0);
  });

  it('returns noop for URL arg without facet options', () => {
    const result = resolveFacetClick({
      arg: '/search/manuscripts',
      action: undefined,
      queryState: BASE_STATE,
      baseFacetURL: 'http://localhost:8000/api/v1/search/item-parts/facets',
    });
    expect(result).toEqual({ type: 'noop' });
  });

  it('treats plain non-url arg as keyword only when no facet opts apply', () => {
    const result = resolveFacetClick({
      arg: 'DCD Misc. Ch. 624',
      action: undefined,
      queryState: BASE_STATE,
      baseFacetURL: 'http://localhost:8000/api/v1/search/item-parts/facets',
    });

    expect(result).toEqual({ type: 'keyword', value: 'DCD Misc. Ch. 624' });
  });
});
