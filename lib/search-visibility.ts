'use client';

import { useCallback, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useSiteFeatures } from '@/contexts/site-features-context';
import { SEARCH_RESULT_CONFIG, getFacetOrder, type ResultType } from '@/lib/search-types';

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
    visibleColumns: [...SEARCH_RESULT_CONFIG[type].defaultVisibleColumns],
    visibleFacets: [...getFacetOrder(type)],
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

  const [researcherValue, setResearcherValue] = useState<FieldVisibility>(() =>
    isResearcher ? (readStored(type) ?? allFieldsFor(type)) : allFieldsFor(type)
  );

  // Re-sync when auth state or result type changes (e.g. switching tabs, login/logout),
  // using the state-setter-during-render pattern to avoid effect-triggered cascades.
  const [prevKey, setPrevKey] = useState(`${isResearcher}:${type}`);
  const currentKey = `${isResearcher}:${type}`;
  if (prevKey !== currentKey) {
    setPrevKey(currentKey);
    setResearcherValue(
      isResearcher ? (readStored(type) ?? allFieldsFor(type)) : allFieldsFor(type)
    );
  }

  const setVisibleColumns = useCallback(
    (next: string[]) => {
      setResearcherValue((prev) => {
        const updated = { ...prev, visibleColumns: next };
        writeStored(type, updated);
        return updated;
      });
    },
    [type]
  );

  const setVisibleFacets = useCallback(
    (next: string[]) => {
      setResearcherValue((prev) => {
        const updated = { ...prev, visibleFacets: next };
        writeStored(type, updated);
        return updated;
      });
    },
    [type]
  );

  const resetToDefault = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(storageKey(type));
    }
    setResearcherValue(allFieldsFor(type));
  }, [type]);

  if (!isResearcher) {
    const guest = siteFeatures.getCategoryConfig(type);
    return {
      visibleColumns: guest.visibleColumns,
      visibleFacets: guest.visibleFacets,
      setVisibleColumns,
      setVisibleFacets,
      resetToDefault,
      isResearcher: false as const,
    };
  }

  return {
    visibleColumns: researcherValue.visibleColumns,
    visibleFacets: researcherValue.visibleFacets,
    setVisibleColumns,
    setVisibleFacets,
    resetToDefault,
    isResearcher: true as const,
  };
}
