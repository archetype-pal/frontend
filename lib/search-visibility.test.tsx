import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getDefaultConfig, type SiteFeaturesConfig } from '@/lib/site-features';
import type { ResultType } from '@/lib/search-types';
import { useSearchVisibility } from './search-visibility';

const mockState = vi.hoisted(() => ({
  token: null as string | null,
  config: null as SiteFeaturesConfig | null,
}));

vi.mock('@/contexts/auth-context', () => ({
  useAuth: () => ({ token: mockState.token }),
}));

vi.mock('@/contexts/site-features-context', () => ({
  useSiteFeatures: () => ({
    getCategoryConfig: (type: ResultType) => mockState.config!.searchCategories[type],
  }),
}));

const storageKey = (type: ResultType) => `archetype:search-visibility:${type}`;

function configWithManuscriptFields(
  visibleColumns: string[],
  visibleFacets: string[]
): SiteFeaturesConfig {
  const config = getDefaultConfig();
  config.searchCategories.manuscripts.visibleColumns = visibleColumns;
  config.searchCategories.manuscripts.visibleFacets = visibleFacets;
  return config;
}

beforeEach(() => {
  window.localStorage.clear();
  mockState.token = null;
  mockState.config = getDefaultConfig();
});

describe('useSearchVisibility', () => {
  it('uses Back Office column and facet selections for guests', () => {
    mockState.config = configWithManuscriptFields(['Repository City'], ['text_date']);

    const { result } = renderHook(() => useSearchVisibility('manuscripts'));

    expect(result.current.visibleColumns).toEqual(['Repository City']);
    expect(result.current.visibleFacets).toEqual(['text_date']);
    expect(result.current.isResearcher).toBe(false);
  });

  it('uses Back Office column and facet selections for logged-in users without local overrides', () => {
    mockState.token = 'tok';
    mockState.config = configWithManuscriptFields(['Repository City'], ['text_date']);

    const { result } = renderHook(() => useSearchVisibility('manuscripts'));

    expect(result.current.visibleColumns).toEqual(['Repository City']);
    expect(result.current.visibleFacets).toEqual(['text_date']);
    expect(result.current.availableColumns).toEqual(['Repository City']);
    expect(result.current.availableFacets).toEqual(['text_date']);
    expect(result.current.isResearcher).toBe(true);
  });

  it('filters stale logged-in local preferences through Back Office selections', () => {
    mockState.token = 'tok';
    mockState.config = configWithManuscriptFields(['Repository City'], ['text_date']);
    window.localStorage.setItem(
      storageKey('manuscripts'),
      JSON.stringify({
        visibleColumns: ['Repository City', 'Shelfmark'],
        visibleFacets: ['text_date', 'format'],
      })
    );

    const { result } = renderHook(() => useSearchVisibility('manuscripts'));

    expect(result.current.visibleColumns).toEqual(['Repository City']);
    expect(result.current.visibleFacets).toEqual(['text_date']);
  });

  it('persists only admin-allowed fields when a logged-in user customizes visibility', () => {
    mockState.token = 'tok';
    mockState.config = configWithManuscriptFields(
      ['Repository City', 'Shelfmark'],
      ['text_date', 'format']
    );

    const { result } = renderHook(() => useSearchVisibility('manuscripts'));

    act(() => {
      result.current.setVisibleColumns(['Shelfmark', 'Doc. Type']);
    });
    act(() => {
      result.current.setVisibleFacets(['format', 'repository_city']);
    });

    expect(result.current.visibleColumns).toEqual(['Shelfmark']);
    expect(result.current.visibleFacets).toEqual(['format']);
    expect(JSON.parse(window.localStorage.getItem(storageKey('manuscripts'))!)).toEqual({
      visibleColumns: ['Shelfmark'],
      visibleFacets: ['format'],
    });
  });

  it('resets logged-in visibility to Back Office selections, not every possible field', () => {
    mockState.token = 'tok';
    mockState.config = configWithManuscriptFields(['Repository City'], ['text_date']);
    window.localStorage.setItem(
      storageKey('manuscripts'),
      JSON.stringify({
        visibleColumns: ['Repository City', 'Shelfmark'],
        visibleFacets: ['text_date', 'format'],
      })
    );

    const { result } = renderHook(() => useSearchVisibility('manuscripts'));

    act(() => {
      result.current.resetToDefault();
    });

    expect(result.current.visibleColumns).toEqual(['Repository City']);
    expect(result.current.visibleFacets).toEqual(['text_date']);
    expect(window.localStorage.getItem(storageKey('manuscripts'))).toBeNull();
  });
});
