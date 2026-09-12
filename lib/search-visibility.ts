'use client';

import { useCallback, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useSiteFeatures } from '@/contexts/site-features-context';
import { getFacetOrder, type ResultType } from '@/lib/search-types';
import { COLUMN_HEADERS_BY_TYPE } from '@/components/search/results-table';

export type FieldVisibility = {
  visibleColumns: string[];
  visibleFacets: string[];
};

const STORAGE_PREFIX = 'archetype:search-visibility:';

function storageKey(type: ResultType) {
  return `${STORAGE_PREFIX}${type}`;
}

function allFieldsFor(type: ResultType): FieldVisibility {
  return {
    visibleColumns: [...COLUMN_HEADERS_BY_TYPE[type]],
    visibleFacets: [...getFacetOrder(type)],
  };
}

function filterAllowed(values: string[], allowed: string[]): string[] {
  const allowedSet = new Set(allowed);
  return values.filter((value) => allowedSet.has(value));
}

function normalizeConfigFields(type: ResultType, value: FieldVisibility): FieldVisibility {
  const all = allFieldsFor(type);
  return {
    visibleColumns: filterAllowed(value.visibleColumns, all.visibleColumns),
    visibleFacets: filterAllowed(value.visibleFacets, all.visibleFacets),
  };
}

function constrainFields(value: FieldVisibility, allowed: FieldVisibility): FieldVisibility {
  return {
    visibleColumns: filterAllowed(value.visibleColumns, allowed.visibleColumns),
    visibleFacets: filterAllowed(value.visibleFacets, allowed.visibleFacets),
  };
}

function readStored(type: ResultType): FieldVisibility | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(storageKey(type));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<FieldVisibility>;
    if (!Array.isArray(parsed.visibleColumns) || !Array.isArray(parsed.visibleFacets)) return null;
    return {
      visibleColumns: parsed.visibleColumns,
      visibleFacets: parsed.visibleFacets,
    };
  } catch {
    return null;
  }
}

function writeStored(type: ResultType, value: FieldVisibility) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(storageKey(type), JSON.stringify(value));
  } catch {
    // ignore quota/serialization errors
  }
}

export function useSearchVisibility(type: ResultType) {
  const { token } = useAuth();
  const siteFeatures = useSiteFeatures();
  const isResearcher = Boolean(token);
  const categoryConfig = siteFeatures.getCategoryConfig(type);
  const allowed = useMemo(
    () => normalizeConfigFields(type, categoryConfig),
    [categoryConfig, type]
  );

  const [researcherValue, setResearcherValue] = useState<FieldVisibility | null>(() =>
    isResearcher ? readStored(type) : null
  );

  // Re-sync when auth state or result type changes (e.g. switching tabs, login/logout),
  // using the state-setter-during-render pattern to avoid effect-triggered cascades.
  const [prevKey, setPrevKey] = useState(`${isResearcher}:${type}`);
  const currentKey = `${isResearcher}:${type}`;
  if (prevKey !== currentKey) {
    setPrevKey(currentKey);
    setResearcherValue(isResearcher ? readStored(type) : null);
  }

  const visible = researcherValue ? constrainFields(researcherValue, allowed) : allowed;

  const setVisibleColumns = useCallback(
    (next: string[]) => {
      setResearcherValue((prev) => {
        const current = prev ? constrainFields(prev, allowed) : allowed;
        const updated = { ...current, visibleColumns: filterAllowed(next, allowed.visibleColumns) };
        writeStored(type, updated);
        return updated;
      });
    },
    [allowed, type]
  );

  const setVisibleFacets = useCallback(
    (next: string[]) => {
      setResearcherValue((prev) => {
        const current = prev ? constrainFields(prev, allowed) : allowed;
        const updated = { ...current, visibleFacets: filterAllowed(next, allowed.visibleFacets) };
        writeStored(type, updated);
        return updated;
      });
    },
    [allowed, type]
  );

  const resetToDefault = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(storageKey(type));
    }
    setResearcherValue(null);
  }, [type]);

  if (!isResearcher) {
    return {
      visibleColumns: allowed.visibleColumns,
      visibleFacets: allowed.visibleFacets,
      availableColumns: allowed.visibleColumns,
      availableFacets: allowed.visibleFacets,
      setVisibleColumns,
      setVisibleFacets,
      resetToDefault,
      isResearcher: false as const,
    };
  }

  return {
    visibleColumns: visible.visibleColumns,
    visibleFacets: visible.visibleFacets,
    availableColumns: allowed.visibleColumns,
    availableFacets: allowed.visibleFacets,
    setVisibleColumns,
    setVisibleFacets,
    resetToDefault,
    isResearcher: true as const,
  };
}
