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

// --- filters-sidebar-collapsed external store (localStorage-backed) ---
//
// The sidebar-collapsed flag lives in localStorage, a browser store that is
// unavailable during SSR. Reading it via useSyncExternalStore keeps the server
// snapshot (`false`) and the client's first paint consistent (no hydration
// mismatch) while letting `toggleFiltersSidebar` notify subscribers so React
// re-renders without an effect.
const sidebarListeners = new Set<() => void>();

function subscribeSidebarCollapsed(onChange: () => void): () => void {
  sidebarListeners.add(onChange);
  const onStorage = (e: StorageEvent) => {
    if (e.key === FILTERS_SIDEBAR_COLLAPSED_KEY) onChange();
  };
  window.addEventListener('storage', onStorage);
  return () => {
    sidebarListeners.delete(onChange);
    window.removeEventListener('storage', onStorage);
  };
}

function getSidebarCollapsedSnapshot(): boolean {
  try {
    return window.localStorage.getItem(FILTERS_SIDEBAR_COLLAPSED_KEY) === 'true';
  } catch {
    return false;
  }
}

function getSidebarCollapsedServerSnapshot(): boolean {
  return false;
}

function setSidebarCollapsed(next: boolean): void {
  try {
    window.localStorage.setItem(FILTERS_SIDEBAR_COLLAPSED_KEY, next ? 'true' : 'false');
  } catch {
    // ignore
  }
  sidebarListeners.forEach((listener) => listener());
}

export function useSearchViewMode(resultType: ResultType) {
  const [viewMode, setViewMode] = React.useState<ViewMode>('table');

  const filtersSidebarCollapsed = React.useSyncExternalStore(
    subscribeSidebarCollapsed,
    getSidebarCollapsedSnapshot,
    getSidebarCollapsedServerSnapshot
  );

  const toggleFiltersSidebar = React.useCallback(() => {
    setSidebarCollapsed(!getSidebarCollapsedSnapshot());
  }, []);

  // Load view mode preference from localStorage when resultType changes.
  //
  // This reads localStorage (a browser-only store) and must therefore run
  // after mount to keep the server/client first paint identical (avoiding a
  // hydration mismatch). It re-keys on `resultType` to restore that type's
  // saved lens, yet must still yield to later `setViewMode` calls from the URL
  // sync / user clicks — so it is a genuine post-mount external-store read, not
  // a value derivable during render or a useSyncExternalStore subscription.
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
      // eslint-disable-next-line react-hooks/set-state-in-effect -- seeds viewMode from a browser-only store (localStorage) post-mount to avoid a hydration mismatch; cannot run during render or via useSyncExternalStore because it is keyed on the resultType prop and must yield to later setViewMode calls
      setViewMode(candidate);
    } catch {
      // ignore invalid persisted prefs
    }
  }, [resultType]);

  // Enforce type restrictions on viewMode. This is pure derivation (the valid
  // viewMode for a given resultType), so it is corrected during render using
  // the store-during-render pattern
  // (https://react.dev/learn/you-might-not-need-an-effect) rather than in an
  // effect. Re-rendering with the corrected value makes the guard fail on the
  // next pass, so it converges in a single extra render with no loop.
  if (
    (isTableOnlyType(resultType) && viewMode !== 'table') ||
    (resultType !== 'graphs' && viewMode === 'distribution') ||
    (isTableOnlyType(resultType) && viewMode === 'map')
  ) {
    setViewMode('table');
  }

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
