'use client';

import * as React from 'react';
import type { ResultType } from '@/lib/search-types';
import { resultTypeItems } from '@/lib/search-types';
import type { ViewMode } from '@/components/search/search-actions-menu';
import { useHotkeys } from '@/hooks/use-hotkeys';
import { isTableOnlyType } from '@/hooks/search/use-search-view-mode';

export function useSearchHotkeys(opts: {
  resultType: ResultType;
  hasTimelineData: boolean;
  setDraftKeyword: (value: string) => void;
  setViewMode: React.Dispatch<React.SetStateAction<ViewMode>>;
  handleResultTypeChange: (next: ResultType) => void;
  toggleFiltersSidebar: () => void;
}) {
  const {
    resultType,
    hasTimelineData,
    setDraftKeyword,
    setViewMode,
    handleResultTypeChange,
    toggleFiltersSidebar,
  } = opts;

  const searchHotkeys = React.useMemo(
    () => [
      {
        key: 'k',
        metaKey: true,
        handler: (event: KeyboardEvent) => {
          event.preventDefault();
          const el = document.getElementById('search-keyword-input') as HTMLInputElement | null;
          el?.focus();
        },
      },
      {
        key: 'k',
        ctrlKey: true,
        handler: (event: KeyboardEvent) => {
          event.preventDefault();
          const el = document.getElementById('search-keyword-input') as HTMLInputElement | null;
          el?.focus();
        },
      },
      {
        key: 'Escape',
        handler: () => {
          setDraftKeyword('');
        },
      },
      ...resultTypeItems.map((item, index) => ({
        key: `${index + 1}`,
        altKey: true,
        handler: (event: KeyboardEvent) => {
          event.preventDefault();
          handleResultTypeChange(item.value);
        },
      })),
      {
        key: 't',
        altKey: true,
        handler: (event: KeyboardEvent) => {
          event.preventDefault();
          setViewMode('table');
        },
      },
      {
        key: 'g',
        altKey: true,
        handler: (event: KeyboardEvent) => {
          event.preventDefault();
          if (!isTableOnlyType(resultType)) setViewMode('grid');
        },
      },
      {
        key: 'l',
        altKey: true,
        handler: (event: KeyboardEvent) => {
          event.preventDefault();
          if (hasTimelineData) setViewMode('timeline');
        },
      },
      {
        key: 's',
        altKey: true,
        handler: (event: KeyboardEvent) => {
          event.preventDefault();
          const actionsBtn = document.getElementById(
            'search-actions-trigger'
          ) as HTMLButtonElement | null;
          actionsBtn?.click();
        },
      },
      {
        key: 'f',
        altKey: true,
        handler: (event: KeyboardEvent) => {
          event.preventDefault();
          if (window.matchMedia('(min-width: 768px)').matches) {
            toggleFiltersSidebar();
            return;
          }
          const mobileBtn = document.getElementById('search-filters-mobile-trigger');
          mobileBtn?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          mobileBtn?.focus();
        },
      },
    ],
    [
      handleResultTypeChange,
      hasTimelineData,
      resultType,
      setDraftKeyword,
      setViewMode,
      toggleFiltersSidebar,
    ]
  );

  useHotkeys(searchHotkeys);
}
