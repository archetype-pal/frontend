import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getDefaultConfig, type SiteFeaturesConfig } from '@/lib/site-features';
import { SEARCH_RESULT_TYPES } from '@/lib/search-types';

const { readSiteFeaturesMock, redirectMock } = vi.hoisted(() => ({
  readSiteFeaturesMock: vi.fn(),
  redirectMock: vi.fn((url: string) => {
    throw new Error(`redirect:${url}`);
  }),
}));

vi.mock('next/navigation', () => ({ redirect: redirectMock }));
vi.mock('@/lib/site-features-server', () => ({ readSiteFeatures: readSiteFeaturesMock }));
vi.mock('@/components/search/search-page', () => ({ SearchPage: () => null }));
vi.mock('@/components/page/page-loading-state', () => ({ PageLoadingState: () => null }));

import SearchTypePage from './page';

let config: SiteFeaturesConfig;

beforeEach(() => {
  config = getDefaultConfig();
  readSiteFeaturesMock.mockReset();
  readSiteFeaturesMock.mockResolvedValue(config);
  redirectMock.mockClear();
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          total: 7,
          results: [],
          facetDistribution: { date_min: { '1100': 2 } },
          facetStats: {},
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    )
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('/search/[type]', () => {
  it('redirects a disabled search category to the first enabled category', async () => {
    config.searchCategories.manuscripts.enabled = false;

    await expect(
      SearchTypePage({ params: Promise.resolve({ type: 'manuscripts' }) })
    ).rejects.toThrow('redirect:/search/images');
    expect(redirectMock).toHaveBeenCalledWith('/search/images');
  });

  it('preserves query params when redirecting a disabled search category', async () => {
    config.searchCategories.manuscripts.enabled = false;

    await expect(
      SearchTypePage({
        params: Promise.resolve({ type: 'manuscripts' }),
        searchParams: Promise.resolve({ keyword: 'Kelso', repository: ['NLS', 'BL'] }),
      })
    ).rejects.toThrow('redirect:/search/images?keyword=Kelso&repository=NLS&repository=BL');
    expect(redirectMock).toHaveBeenCalledWith(
      '/search/images?keyword=Kelso&repository=NLS&repository=BL'
    );
  });

  it('redirects invalid category slugs to the first enabled category', async () => {
    await expect(SearchTypePage({ params: Promise.resolve({ type: 'missing' }) })).rejects.toThrow(
      'redirect:/search/manuscripts'
    );
    expect(redirectMock).toHaveBeenCalledWith('/search/manuscripts');
  });

  it('redirects to not-found when the persisted config has no enabled category', async () => {
    for (const type of SEARCH_RESULT_TYPES) {
      config.searchCategories[type].enabled = false;
    }

    await expect(
      SearchTypePage({ params: Promise.resolve({ type: 'manuscripts' }) })
    ).rejects.toThrow('redirect:/not-found');
    expect(redirectMock).toHaveBeenCalledWith('/not-found');
  });

  it('prefetches the active search query for hydration', async () => {
    await SearchTypePage({
      params: Promise.resolve({ type: 'manuscripts' }),
      searchParams: Promise.resolve({
        keyword: 'Kelso',
        limit: '20',
        offset: '0',
        repository: ['NLS', 'BL'],
      }),
    });

    const fetchMock = vi.mocked(fetch);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe(
      'http://localhost:8000/api/v1/search/item-parts/facets/?limit=20&offset=0&repository=BL&repository=NLS&q=Kelso'
    );
    expect(init).toEqual(expect.objectContaining({ cache: 'no-store' }));
  });
});
