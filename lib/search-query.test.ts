import { describe, expect, it } from 'vitest';
import {
  buildActiveQueryTags,
  buildAdvancedExtraParams,
  buildDateFilterTag,
  buildQueryString,
  normalizeQueryState,
  parseQueryRootFromUrl,
  resetQueryForTypeChange,
  resolveFacetClick,
  stateFromSearchParams,
} from './search-query';
import type { QueryGroup, QueryState } from './search-query';

describe('query-builder qb round-trip', () => {
  it('decodes the encoded tree across every base64url padding length', () => {
    // Vary the JSON length by one char per iteration so the base64url length
    // cycles through all `% 4` residues — including the 2/3 cases whose padding
    // a buggy `-len % 4` computed as negative, throwing and dropping the tree.
    for (let i = 0; i < 8; i++) {
      const root: QueryGroup = {
        id: 'g',
        t: 'group',
        op: 'AND',
        items: [{ id: 'c', t: 'cond', field: 'repository_name', op: 'gt', value: 'x'.repeat(i) }],
      };
      const { qb } = buildAdvancedExtraParams({
        enabled: true,
        matchingStrategy: 'all',
        searchField: '',
        queryRoot: root,
      });
      const decoded = parseQueryRootFromUrl(new URLSearchParams({ qb: qb as string }));
      expect(decoded).toEqual(root);
    }
  });
});

describe('buildActiveQueryTags', () => {
  it('builds keyword, date, and facet tags in expected order', () => {
    const tags = buildActiveQueryTags({
      submittedKeyword: '  DCD   Misc  ',
      dateParams: { min_date: '1100', max_date: '1200' },
      selectedFacets: ['repository_name_exact:Durham'],
      searchType: 'manuscripts',
      extraParams: {},
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

describe('resetQueryForTypeChange', () => {
  it('wipes all per-type filter/sort/page state and keeps page size', () => {
    const reset = resetQueryForTypeChange({
      limit: 50,
      offset: 700,
      ordering: 'catalogue_numbers_exact',
      selected_facets: ['repository_name_exact:Durham', 'type_exact:Charter'],
      dateParams: { min_date: '1100', max_date: '1200' },
      extraParams: { repository_name__not: 'York' },
    });

    expect(reset).toEqual({
      limit: 50, // page size preserved
      offset: 0, // page reset (no out-of-range page carried into the next type)
      ordering: null, // sort reset (a per-type sort field is invalid on another type)
      selected_facets: [],
      dateParams: {},
      extraParams: {},
    });
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

  it('selectFacet clears a matching exclusion (include and exclude are mutually exclusive)', () => {
    const result = resolveFacetClick({
      arg: '/unused',
      action: { type: 'selectFacet', facetKey: 'repository_name', value: 'Durham' },
      queryState: {
        limit: 20,
        offset: 40,
        ordering: null,
        selected_facets: [],
        dateParams: {},
        extraParams: { repository_name__not: 'Durham', type__not: ['Brieve'] },
      },
      baseFacetURL: 'http://localhost:8000/api/v1/search/item-parts/facets',
    });

    expect(result.type).toBe('query');
    if (result.type !== 'query') return;
    expect(result.value.selected_facets).toEqual(['repository_name_exact:Durham']);
    // Its own exclusion is dropped; an unrelated exclusion survives.
    expect(result.value.extraParams).toEqual({ type__not: ['Brieve'] });
    expect(result.value.offset).toBe(0);
  });

  it('excludeFacet clears a matching inclusion (include and exclude are mutually exclusive)', () => {
    const result = resolveFacetClick({
      arg: '',
      action: { type: 'excludeFacet', facetKey: 'repository_name', value: 'Durham' },
      queryState: {
        limit: 20,
        offset: 40,
        ordering: null,
        selected_facets: ['repository_name_exact:Durham', 'type_exact:Charter'],
        dateParams: {},
        extraParams: {},
      },
      baseFacetURL: 'http://localhost:8000/api/v1/search/item-parts/facets',
    });

    expect(result.type).toBe('query');
    if (result.type !== 'query') return;
    // The Durham inclusion is removed; an unrelated inclusion is kept.
    expect(result.value.selected_facets).toEqual(['type_exact:Charter']);
    expect(result.value.extraParams).toEqual({ repository_name__not: 'Durham' });
    expect(result.value.offset).toBe(0);
  });

  it('removeExclusion drops the value from the __not list', () => {
    const result = resolveFacetClick({
      arg: '',
      action: { type: 'removeExclusion', facetKey: 'repository_name', value: 'Durham' },
      queryState: {
        limit: 20,
        offset: 40,
        ordering: null,
        selected_facets: [],
        dateParams: {},
        extraParams: { repository_name__not: ['Durham', 'York'] },
      },
      baseFacetURL: 'http://localhost:8000/api/v1/search/item-parts/facets',
    });

    expect(result.type).toBe('query');
    if (result.type !== 'query') return;
    expect(result.value.extraParams).toEqual({ repository_name__not: 'York' });
    expect(result.value.offset).toBe(0);
  });

  it('adds exclusion tags from extraParams', () => {
    const tags = buildActiveQueryTags({
      submittedKeyword: '',
      dateParams: {},
      selectedFacets: [],
      searchType: 'manuscripts',
      extraParams: { repository_name__not: ['A', 'B'] },
    });
    expect(tags.some((t) => t.exclude && t.value === 'A')).toBe(true);
    expect(tags.some((t) => t.exclude && t.value === 'B')).toBe(true);
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
