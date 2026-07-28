import * as React from 'react';
import { describe, expect, it } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import type { QueryState } from '@/lib/search-query';
import { useSearchQuery } from './use-search-query';

const INITIAL: QueryState = {
  limit: 20,
  offset: 0,
  ordering: null,
  selected_facets: [],
  dateParams: {},
  extraParams: {},
};

const noop = () => {};

type Hook = ReturnType<typeof useSearchQuery>;

/**
 * Mount the hook with NO `ordering` block from the response — the shape
 * `EMPTY_SEARCH_RESULT` has (a failed facets fetch), which is exactly when
 * `handleSort` falls through to its local toggle branch instead of following a
 * server-supplied ordering URL.
 */
function mountHook() {
  const ref: { current: Hook | null } = { current: null };

  function Harness() {
    ref.current = useSearchQuery({
      initialQueryState: INITIAL,
      resultType: 'manuscripts',
      baseFacetURL: 'https://example.test/api/v1/search/manuscripts/facets/',
      submittedKeyword: '',
      ordering: undefined,
      setDraftKeyword: noop,
      setSubmittedKeyword: noop,
      handleClearKeyword: noop,
    });
    return null;
  }

  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => root.render(<Harness />));

  return {
    get hook() {
      if (!ref.current) throw new Error('hook not mounted');
      return ref.current;
    },
    unmount: () => {
      act(() => root.unmount());
      container.remove();
    },
  };
}

describe('useSearchQuery — sort key convention', () => {
  it('toggles direction on a repeated column click even after the dropdown set the sort', () => {
    const h = mountHook();
    try {
      // The Sort-by dropdown writes the CANONICAL attribute…
      act(() => h.hook.handleSortChange({ attribute: 'shelfmark', descending: false }));
      expect(h.hook.queryState.ordering).toBe('shelfmark');
      expect(h.hook.sortKey).toBe('shelfmark');

      // …and the column header hands back the `_exact` filter form for the same
      // field. Comparing the two conventions used to look like a different
      // column, resetting to ascending instead of flipping.
      act(() => h.hook.handleSort({ sortKey: 'shelfmark_exact' }));
      expect(h.hook.queryState.ordering).toBe('-shelfmark');
      expect(h.hook.ascending).toBe(false);

      // And it keeps alternating.
      act(() => h.hook.handleSort({ sortKey: 'shelfmark_exact' }));
      expect(h.hook.queryState.ordering).toBe('shelfmark');
      expect(h.hook.ascending).toBe(true);
    } finally {
      h.unmount();
    }
  });

  it('toggles across repeated header clicks on the same column', () => {
    const h = mountHook();
    try {
      act(() => h.hook.handleSort({ sortKey: 'number_of_images_exact' }));
      expect(h.hook.queryState.ordering).toBe('number_of_images');

      act(() => h.hook.handleSort({ sortKey: 'number_of_images_exact' }));
      expect(h.hook.queryState.ordering).toBe('-number_of_images');

      // A different column restarts at ascending.
      act(() => h.hook.handleSort({ sortKey: 'catalogue_numbers_exact' }));
      expect(h.hook.queryState.ordering).toBe('catalogue_numbers');
    } finally {
      h.unmount();
    }
  });

  it('stores the canonical attribute, not the `_exact` filter form', () => {
    const h = mountHook();
    try {
      act(() => h.hook.handleSort({ sortKey: 'number_of_annotations_exact' }));
      expect(h.hook.queryState.ordering).toBe('number_of_annotations');
      expect(h.hook.sortKey).toBe('number_of_annotations');
    } finally {
      h.unmount();
    }
  });

  it('sorting resets the offset so the new order starts at page 1', () => {
    const h = mountHook();
    try {
      act(() => h.hook.handlePage(8));
      expect(h.hook.queryState.offset).toBe(140);

      act(() => h.hook.handleSort({ sortKey: 'shelfmark_exact' }));
      expect(h.hook.queryState.offset).toBe(0);
    } finally {
      h.unmount();
    }
  });

  it('clears the ordering when the dropdown selects Relevance', () => {
    const h = mountHook();
    try {
      act(() => h.hook.handleSortChange({ attribute: 'date_min', descending: true }));
      expect(h.hook.queryState.ordering).toBe('-date_min');

      act(() => h.hook.handleSortChange({ attribute: null, descending: false }));
      expect(h.hook.queryState.ordering).toBeNull();
    } finally {
      h.unmount();
    }
  });
});
