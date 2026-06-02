'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import type { CollectionItem } from '@/contexts/collection-context';
import type { CollectionAnnotationGroupBy } from '@/lib/collection-grouping';

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

function readInitialAnnotationGroup(searchParams: URLSearchParams): CollectionAnnotationGroupBy {
  const value = searchParams.get('group');
  return value === 'allograph' || value === 'hand' || value === 'manuscript' ? value : 'none';
}

export function useCollectionViewState(items: CollectionItem[], clearCollection: () => void) {
  const searchParams = useSearchParams();
  const [filter, setFilter] = React.useState<FilterType>(() => readInitialFilter(searchParams));
  const [sortBy, setSortBy] = React.useState<SortOption>(() => readInitialSort(searchParams));
  const [view, setView] = React.useState<CollectionView>(() => readInitialView(searchParams));
  const [annotationGroup, setAnnotationGroup] = React.useState<CollectionAnnotationGroupBy>(() =>
    readInitialAnnotationGroup(searchParams)
  );
  const [showClearConfirm, setShowClearConfirm] = React.useState(false);
  const timeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  React.useEffect(() => {
    const params = new URLSearchParams();
    if (filter !== 'all') params.set('filter', filter);
    if (sortBy !== 'added') params.set('sort', sortBy);
    if (view !== 'grid') params.set('view', view);
    if (annotationGroup !== 'none') params.set('group', annotationGroup);
    window.history.replaceState(
      null,
      '',
      params.toString() ? `/collection?${params}` : '/collection'
    );
  }, [annotationGroup, filter, sortBy, view]);

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
    annotationGroup,
    setAnnotationGroup,
    showClearConfirm,
    filteredItems,
    handleClear,
  };
}
