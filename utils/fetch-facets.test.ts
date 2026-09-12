import { afterEach, describe, expect, it, vi } from 'vitest';

import { DEFAULT_QUERY } from '@/lib/search-query';
import { getSearchResultsQueryOptions } from '@/utils/fetch-facets';

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
