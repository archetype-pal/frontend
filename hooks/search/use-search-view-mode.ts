'use client';

import * as React from 'react';
import type { ResultType } from '@/lib/search-types';
import type { ViewMode } from '@/components/search/search-actions-menu';

export const TABLE_ONLY_TYPES: readonly ResultType[] = ['texts', 'people', 'places'];
export const TABLE_ONLY_TYPE_SET = new Set<ResultType>(TABLE_ONLY_TYPES);
export const VIEW_PREFS_KEY = 'search-view-prefs';
export const FILTERS_SIDEBAR_COLLAPSED_KEY = 'search-filters-sidebar-collapsed';

export function isTableOnlyType(type: ResultType): boolean {
  return TABLE_ONLY_TYPE_SET.has(type);
}

export function parseViewModeParam(raw: string | null, resultType: ResultType): ViewMode | null {
  if (!raw) return null;
  const v = raw as ViewMode;
  const allowed: ViewMode[] = ['table', 'grid', 'timeline', 'distribution', 'map'];
  if (!allowed.includes(v)) return null;
  if (v === 'distribution' && resultType !== 'graphs') return null;
  if ((v === 'map' || v === 'grid') && isTableOnlyType(resultType)) return null;
  return v;
}

export function useSearchViewMode(resultType: ResultType) {
  const [viewMode, setViewMode] = React.useState<ViewMode>('table');
  const [filtersSidebarCollapsed, setFiltersSidebarCollapsed] = React.useState(false);

  // Load sidebar collapsed preference from localStorage
  React.useEffect(() => {
    try {
      const raw = window.localStorage.getItem(FILTERS_SIDEBAR_COLLAPSED_KEY);
      if (raw === 'true') setFiltersSidebarCollapsed(true);
    } catch {
      // ignore
    }
  }, []);

  const toggleFiltersSidebar = React.useCallback(() => {
    setFiltersSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(FILTERS_SIDEBAR_COLLAPSED_KEY, next ? 'true' : 'false');
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  // Load view mode preference from localStorage when resultType changes
  React.useEffect(() => {
    try {
      const raw = window.localStorage.getItem(VIEW_PREFS_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Record<string, ViewMode>;
      const candidate = parsed[resultType];
      if (!candidate) return;
      if (candidate === 'distribution' && resultType !== 'graphs') return;
      if (candidate === 'map' && isTableOnlyType(resultType)) return;
      if (candidate === 'grid' && isTableOnlyType(resultType)) return;
      setViewMode(candidate);
    } catch {
      // ignore invalid persisted prefs
    }
  }, [resultType]);

  // Enforce type restrictions on viewMode
  React.useEffect(() => {
    if (isTableOnlyType(resultType) && viewMode !== 'table') setViewMode('table');
    if (resultType !== 'graphs' && viewMode === 'distribution') setViewMode('table');
    if (isTableOnlyType(resultType) && viewMode === 'map') setViewMode('table');
  }, [resultType, viewMode]);

  // Persist view mode preference to localStorage
  React.useEffect(() => {
    try {
      const raw = window.localStorage.getItem(VIEW_PREFS_KEY);
      const parsed = raw ? (JSON.parse(raw) as Record<string, ViewMode>) : {};
      parsed[resultType] = viewMode;
      window.localStorage.setItem(VIEW_PREFS_KEY, JSON.stringify(parsed));
    } catch {
      // ignore persistence failures
    }
  }, [resultType, viewMode]);

  return {
    viewMode,
    setViewMode,
    filtersSidebarCollapsed,
    toggleFiltersSidebar,
  };
}
