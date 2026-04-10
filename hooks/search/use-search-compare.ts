'use client';

import * as React from 'react';
import type { ResultType } from '@/lib/search-types';

export const MAX_COMPARE_ITEMS = 3;

export function useSearchCompare(opts: { resultType: ResultType; filtered: unknown[] }) {
  const { resultType, filtered } = opts;

  const [compareIds, setCompareIds] = React.useState<string[]>([]);
  const [compareOpen, setCompareOpen] = React.useState(false);

  const compareEnabled = resultType === 'manuscripts' || resultType === 'graphs';

  const selectedCompareItems = React.useMemo(() => {
    if (!compareEnabled) return [];
    const selected = (filtered as Array<{ id: string | number }>).filter((item) =>
      compareIds.includes(String(item.id))
    );
    return selected.slice(0, MAX_COMPARE_ITEMS);
  }, [compareEnabled, compareIds, filtered]);

  const toggleCompare = React.useCallback((id: string | number) => {
    const normalized = String(id);
    setCompareIds((prev) => {
      if (prev.includes(normalized)) return prev.filter((item) => item !== normalized);
      if (prev.length >= MAX_COMPARE_ITEMS) return prev;
      return [...prev, normalized];
    });
  }, []);

  const clearCompareIds = React.useCallback(() => {
    setCompareIds([]);
  }, []);

  return {
    compareIds,
    setCompareIds,
    compareOpen,
    setCompareOpen,
    compareEnabled,
    selectedCompareItems,
    toggleCompare,
    clearCompareIds,
  };
}
