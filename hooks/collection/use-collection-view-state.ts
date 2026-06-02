'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import type { CollectionItem } from '@/contexts/collection-context';

export type SortOption = 'added' | 'name' | 'repository';
export type FilterType = 'all' | 'image' | 'graph';
export type CollectionView = 'grid' | 'table';

function readInitialFilter(searchParams: URLSearchParams): FilterType {
  const value = searchParams.get('filter');
  return value === 'image' || value === 'graph' ? value : 'all';
}

function readInitialSort(searchParams: URLSearchParams): SortOption {
  const value = searchParams.get('sort');
  return value === 'name' || value === 'repository' ? value : 'added';
}

function readInitialView(searchParams: URLSearchParams): CollectionView {
  return searchParams.get('view') === 'table' ? 'table' : 'grid';
}

export function useCollectionViewState(items: CollectionItem[], clearCollection: () => void) {
  const searchParams = useSearchParams();
  const [filter, setFilter] = React.useState<FilterType>(() => readInitialFilter(searchParams));
  const [sortBy, setSortBy] = React.useState<SortOption>(() => readInitialSort(searchParams));
  const [view, setView] = React.useState<CollectionView>(() => readInitialView(searchParams));
  const [showClearConfirm, setShowClearConfirm] = React.useState(false);
  const timeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  React.useEffect(() => {
    const params = new URLSearchParams();
    if (filter !== 'all') params.set('filter', filter);
    if (sortBy !== 'added') params.set('sort', sortBy);
    if (view !== 'grid') params.set('view', view);
    window.history.replaceState(
      null,
      '',
      params.toString() ? `/collection?${params}` : '/collection'
    );
  }, [filter, sortBy, view]);

  React.useEffect(() => {
    if (items.length !== 0 || !showClearConfirm) return;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) setShowClearConfirm(false);
    });

    return () => {
      cancelled = true;
    };
  }, [items.length, showClearConfirm]);

  React.useEffect(
    () => () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    },
    []
  );

  const filteredItems = React.useMemo(() => {
    const filtered = filter === 'all' ? items : items.filter((item) => item.type === filter);
    if (sortBy === 'added') return filtered;

    return [...filtered].sort((a, b) => {
      if (sortBy === 'name') {
        const nameA = (
          a.type === 'image' ? a.shelfmark || a.locus || '' : a.shelfmark || ''
        ).toLowerCase();
        const nameB = (
          b.type === 'image' ? b.shelfmark || b.locus || '' : b.shelfmark || ''
        ).toLowerCase();
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
    view,
    setView,
    showClearConfirm,
    filteredItems,
    handleClear,
  };
}
