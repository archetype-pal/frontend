/** @vitest-environment jsdom */
import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { parseViewModeParam, useSearchViewMode } from './use-search-view-mode';

const VIEW_PREFS_KEY = 'search-view-prefs';

afterEach(() => {
  window.localStorage.clear();
});

describe('search view mode', () => {
  it('opens an old map link in the default view', () => {
    expect(parseViewModeParam('map', 'manuscripts')).toBeNull();
    expect(parseViewModeParam('grid', 'manuscripts')).toBe('grid');
  });

  it('shows the table to someone who last used the map', () => {
    window.localStorage.setItem(VIEW_PREFS_KEY, JSON.stringify({ manuscripts: 'map' }));

    const { result } = renderHook(() => useSearchViewMode('manuscripts'));

    expect(result.current.viewMode).toBe('table');
  });

  it('still restores a saved view that exists', () => {
    window.localStorage.setItem(VIEW_PREFS_KEY, JSON.stringify({ manuscripts: 'grid' }));

    const { result } = renderHook(() => useSearchViewMode('manuscripts'));

    expect(result.current.viewMode).toBe('grid');
  });
});
