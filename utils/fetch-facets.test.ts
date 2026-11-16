import { afterEach, describe, expect, it, vi } from 'vitest';

import { DEFAULT_QUERY } from '@/lib/search-query';
import { jsonResponse } from '@/test/responses';
import type { FacetData } from '@/types/facets';
import {
  fetchDateBounds,
  getSearchResultsQueryOptions,
  withFixedDateBounds,
} from '@/utils/fetch-facets';

describe('getSearchResultsQueryOptions', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('keeps the query key public while fetching through an internal server URL', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ total: 0, results: [] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      )
    );

    const query = getSearchResultsQueryOptions('manuscripts', DEFAULT_QUERY, 'Kelso', {
      fetchBaseUrl: 'http://host.docker.internal:8000',
      keyBaseUrl: 'http://localhost:8000',
    });

    expect(query.apiUrl).toBe(
      'http://host.docker.internal:8000/api/v1/search/item-parts/facets/?limit=20&offset=0&q=Kelso'
    );
    expect(query.queryKey).toEqual([
      'search',
      'manuscripts',
      'facets',
      'http://localhost:8000/api/v1/search/item-parts/facets/?limit=20&offset=0&q=Kelso',
    ]);

    await query.queryFn({});

    expect(fetch).toHaveBeenCalledWith(
      'http://host.docker.internal:8000/api/v1/search/item-parts/facets/?limit=20&offset=0&q=Kelso',
      expect.objectContaining({ cache: 'no-store' })
    );
  });
});

describe('fetchDateBounds', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('reads the index date extent from an unfiltered request', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse({
          facetStats: { date_min: { min: 1093, max: 1308 }, date_max: { min: 1094, max: 1309 } },
        })
      )
    );

    await expect(fetchDateBounds('manuscripts')).resolves.toEqual([1093, 1309]);
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining(
        '/api/v1/search/item-parts/facets/?limit=1&facets=date_min%2Cdate_max&attributes_to_retrieve=id'
      ),
      expect.objectContaining({ cache: 'no-store' })
    );
  });

  it('has no bounds for an index without dates', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ facetStats: {} })));

    await expect(fetchDateBounds('scribes')).resolves.toBeNull();
  });
});

describe('withFixedDateBounds', () => {
  const narrowed: FacetData = {
    text_date: { kind: 'range', range: [1150, 1200], defaultValue: [1150, 1200] },
  };

  it('replaces the narrowed range with the index bounds', () => {
    expect(withFixedDateBounds(narrowed, [1093, 1309], ['text_date']).text_date).toEqual({
      kind: 'range',
      range: [1093, 1309],
      defaultValue: [1093, 1309],
    });
  });

  it('keeps the date facet when a date window leaves no results', () => {
    expect(withFixedDateBounds({}, [1093, 1309], ['text_date']).text_date).toBeDefined();
  });

  it('adds no facet for a date the tab does not show', () => {
    expect(withFixedDateBounds({}, [1093, 1309], [])).toEqual({});
  });

  it('leaves the facets as they are until the bounds are known', () => {
    expect(withFixedDateBounds(narrowed, null, ['text_date'])).toBe(narrowed);
  });
});
