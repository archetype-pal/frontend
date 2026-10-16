import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { ViewMode } from '@/components/search/search-actions-menu';
import type { ResultType } from '@/lib/search-types';
import { useResultsScroll } from './use-results-scroll';

type Shown = { resultType: ResultType; offset: number; viewMode: ViewMode };

/** Renders the hook with the results' top scrolled 600px above the viewport. */
function renderScrolledResults(initial: Shown) {
  const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  const results = document.createElement('main');
  results.getBoundingClientRect = () => ({ top: -600 }) as DOMRect;
  results.scrollIntoView = vi.fn();

  const hook = renderHook(
    (shown: Shown) => {
      const ref = useResultsScroll(shown.resultType, shown.offset, shown.viewMode);
      ref.current = results;
    },
    { initialProps: initial }
  );
  scrollTo.mockClear();
  return { ...hook, results, scrollTo };
}

describe('useResultsScroll', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('scrolls back up to the top of the results when the page changes', () => {
    const { rerender, results, scrollTo } = renderScrolledResults({
      resultType: 'manuscripts',
      offset: 0,
      viewMode: 'table',
    });

    rerender({ resultType: 'manuscripts', offset: 20, viewMode: 'table' });

    expect(results.scrollIntoView).toHaveBeenCalledWith({ block: 'start', behavior: 'smooth' });
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it('starts another result type or view at the top of the page', () => {
    const { rerender, results, scrollTo } = renderScrolledResults({
      resultType: 'manuscripts',
      offset: 20,
      viewMode: 'table',
    });

    rerender({ resultType: 'images', offset: 0, viewMode: 'table' });
    rerender({ resultType: 'images', offset: 0, viewMode: 'grid' });

    expect(scrollTo).toHaveBeenCalledTimes(2);
    expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
    expect(results.scrollIntoView).not.toHaveBeenCalled();
  });
});
