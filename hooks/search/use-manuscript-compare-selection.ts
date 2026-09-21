'use client';

import * as React from 'react';
import { MAX_COMPARE_ITEMS } from '@/stores/compare-store';

/**
 * Checkbox selection for the manuscripts search results, feeding the
 * search page's "Compare" action. Capped at `MAX_COMPARE_ITEMS` independently
 * of whatever's already staged in the compare store — simple and predictable
 * ("select up to 4 at a time") rather than a moving target based on store
 * state. Selection resets whenever `resetKey` changes (new search/filter/page),
 * so a stale, no-longer-visible selection can't silently ride along.
 */
export function useManuscriptCompareSelection(resetKey: string) {
  const [selectedIds, setSelectedIds] = React.useState<Set<number>>(() => new Set());
  const prevKey = React.useRef(resetKey);

  React.useEffect(() => {
    if (prevKey.current !== resetKey) {
      prevKey.current = resetKey;
      setSelectedIds(new Set());
    }
  }, [resetKey]);

  const isSelected = React.useCallback((id: number) => selectedIds.has(id), [selectedIds]);

  const isDisabled = React.useCallback(
    (id: number) => !selectedIds.has(id) && selectedIds.size >= MAX_COMPARE_ITEMS,
    [selectedIds]
  );

  const toggle = React.useCallback((id: number) => {
    setSelectedIds((prev) => {
      if (prev.has(id)) {
        const next = new Set(prev);
        next.delete(id);
        return next;
      }
      if (prev.size >= MAX_COMPARE_ITEMS) return prev;
      return new Set(prev).add(id);
    });
  }, []);

  const clear = React.useCallback(() => setSelectedIds(new Set()), []);

  return { selectedIds, isSelected, isDisabled, toggle, clear, count: selectedIds.size };
}

export type ManuscriptCompareSelection = ReturnType<typeof useManuscriptCompareSelection>;
