'use client';

import * as React from 'react';

import type { ViewMode } from '@/components/search/search-actions-menu';
import type { ResultType } from '@/lib/search-types';
import { scrollBehavior, scrollUpToElement } from '@/lib/scroll-utils';

/**
 * Scrolls Explore when what it shows changes. Another result type or view starts at the top of
 * the page; another page of the same results scrolls back up to the top of the results, never
 * down. Returns the ref for the results container.
 */
export function useResultsScroll(resultType: ResultType, offset: number, viewMode: ViewMode) {
  const resultsRef = React.useRef<HTMLElement>(null);
  const shownView = React.useRef<{ resultType: ResultType; viewMode: ViewMode } | null>(null);

  React.useEffect(() => {
    const previous = shownView.current;
    shownView.current = { resultType, viewMode };
    if (!previous || previous.resultType !== resultType || previous.viewMode !== viewMode) {
      window.scrollTo({ top: 0, behavior: scrollBehavior() });
    } else {
      scrollUpToElement(resultsRef.current);
    }
  }, [resultType, offset, viewMode]);

  return resultsRef;
}
