'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import type { CollectionItem } from '@/contexts/collection-context';

export type SortOption = 'added' | 'name' | 'repository';
export type FilterType = 'all' | 'image' | 'graph';

function readInitialFilter(searchParams: URLSearchParams): FilterType {
  const value = searchParams.get('filter');
  return value === 'image' || value === 'graph' ? value : 'all';
}

function readInitialSort(searchParams: URLSearchParams): SortOption {
  const value = searchParams.get('sort');
  return value === 'name' || value === 'repository' ? value : 'added';
}

export function useCollectionViewState(items: CollectionItem[], clearCollection: () => void) {
  const searchParams = useSearchParams();
  const [filter, setFilter] = React.useState<FilterType>(() => readInitialFilter(searchParams));
  const [sortBy, setSortBy] = React.useState<SortOption>(() => readInitialSort(searchParams));
  const [showClearConfirm, setShowClearConfirm] = React.useState(false);
  const timeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  React.useEffect(() => {
    const params = new URLSearchParams();
    if (filter !== 'all') params.set('filter', filter);
    if (sortBy !== 'added') params.set('sort', sortBy);
    window.history.replaceState(null, '', params.toString() ? `/collection?${params}` : '/collection');
  }, [filter, sortBy]);

  React.useEffect(() => {
    if (items.length === 0) {
      setShowClearConfirm(false);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    }
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [items.length]);

  const filteredItems = React.useMemo(() => {
    const filtered = filter === 'all' ? items : items.filter((item) => item.type === filter);
    if (sortBy === 'added') return filtered;

    return [...filtered].sort((a, b) => {
      if (sortBy === 'name') {
        const nameA = (a.type === 'image' ? a.shelfmark || a.locus || '' : a.shelfmark || '').toLowerCase();
        const nameB = (b.type === 'image' ? b.shelfmark || b.locus || '' : b.shelfmark || '').toLowerCase();
        return nameA.localeCompare(nameB);
      }
      return (a.repository_name || '')
        .toLowerCase()
        .localeCompare((b.repository_name || '').toLowerCase());
    });
  }, [items, filter, sortBy]);

  const handleClear = () => {
    if (showClearConfirm) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      clearCollection();
      setShowClearConfirm(false);
      return;
    }
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setShowClearConfirm(true);
    timeoutRef.current = setTimeout(() => {
      setShowClearConfirm(false);
      timeoutRef.current = null;
    }, 5000);
  };

  return {
    filter,
    setFilter,
    sortBy,
    setSortBy,
    showClearConfirm,
    filteredItems,
    handleClear,
  };
}
