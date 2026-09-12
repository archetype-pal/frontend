import { beforeEach, describe, expect, it, vi } from 'vitest';

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

import SearchIndexPage from './page';

let config: SiteFeaturesConfig;

beforeEach(() => {
  config = getDefaultConfig();
  readSiteFeaturesMock.mockReset();
  readSiteFeaturesMock.mockResolvedValue(config);
  redirectMock.mockClear();
});

describe('/search', () => {
  it('redirects to the first enabled search category', async () => {
    config.searchCategories.manuscripts.enabled = false;

    await expect(SearchIndexPage({})).rejects.toThrow('redirect:/search/images');
    expect(redirectMock).toHaveBeenCalledWith('/search/images');
  });

  it('preserves query params on the redirect', async () => {
    config.searchCategories.manuscripts.enabled = false;

    await expect(
      SearchIndexPage({
        searchParams: Promise.resolve({ keyword: 'Kelso', repository: ['NLS', 'BL'] }),
      })
    ).rejects.toThrow('redirect:/search/images?keyword=Kelso&repository=NLS&repository=BL');
    expect(redirectMock).toHaveBeenCalledWith(
      '/search/images?keyword=Kelso&repository=NLS&repository=BL'
    );
  });

  it('redirects to not-found when no search category is enabled', async () => {
    for (const type of SEARCH_RESULT_TYPES) {
      config.searchCategories[type].enabled = false;
    }

    await expect(SearchIndexPage({})).rejects.toThrow('redirect:/not-found');
    expect(redirectMock).toHaveBeenCalledWith('/not-found');
  });
});
