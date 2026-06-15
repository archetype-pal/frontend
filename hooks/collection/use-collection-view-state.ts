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

function getCollectionStateSearchParams(searchParams: URLSearchParams): URLSearchParams {
  const params = new URLSearchParams(searchParams.toString());
  params.delete('filter');
  params.delete('sort');
  params.delete('view');
  params.delete('group');
  return params;
}

export function useCollectionViewState(items: CollectionItem[], clearCollection: () => void) {
  const searchParams = useSearchParams();
  const baseSearchParams = React.useMemo(
    () => getCollectionStateSearchParams(searchParams).toString(),
    [searchParams]
  );
  const [filter, setFilter] = React.useState<FilterType>(() => readInitialFilter(searchParams));
  const [sortBy, setSortBy] = React.useState<SortOption>(() => readInitialSort(searchParams));
  const [view, setView] = React.useState<CollectionView>(() => readInitialView(searchParams));
  const [annotationGroup, setAnnotationGroup] = React.useState<CollectionAnnotationGroupBy>(() =>
    readInitialAnnotationGroup(searchParams)
  );
  const [showClearConfirm, setShowClearConfirm] = React.useState(false);
  const timeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  // Read direction: resync state when the URL's filter/sort/view/group params
  // change externally (back/forward, a shared link via client nav). The write
  // effect below uses `history.replaceState`, which does not feed back into
  // `useSearchParams`, so this can't echo our own writes — only genuine
  // navigation moves these values.
  const urlFilter = readInitialFilter(searchParams);
  const urlSort = readInitialSort(searchParams);
  const urlView = readInitialView(searchParams);
  const urlGroup = readInitialAnnotationGroup(searchParams);
  React.useEffect(() => {
    setFilter(urlFilter);
    setSortBy(urlSort);
    setView(urlView);
    setAnnotationGroup(urlGroup);
  }, [urlFilter, urlSort, urlView, urlGroup]);

  React.useEffect(() => {
    const params = new URLSearchParams(baseSearchParams);
    if (filter !== 'all') params.set('filter', filter);
    if (sortBy !== 'added') params.set('sort', sortBy);
    if (view !== 'grid') params.set('view', view);
    if (annotationGroup !== 'none') params.set('group', annotationGroup);
    const hash = window.location.hash;
    const path = params.toString() ? `/collection?${params}` : '/collection';
    window.history.replaceState(null, '', `${path}${hash}`);
  }, [annotationGroup, baseSearchParams, filter, sortBy, view]);

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
