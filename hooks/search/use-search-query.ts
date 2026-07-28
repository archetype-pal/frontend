'use client';

import * as React from 'react';
import type { FacetClickAction } from '@/types/facets';
import type { ResultType } from '@/lib/search-types';
import {
  buildActiveQueryTags,
  clearAllFacetFilters,
  clearDateFilters,
  removeExclusionFromExtraParams,
  resolveFacetClick,
  stateFromUrl,
  withLimit,
  withOffset,
  type ActiveFacetTag,
  type QueryState,
} from '@/lib/search-query';
import { canonicalSortAttribute, formatOrdering } from '@/lib/search-sort';
import type { SearchResult } from '@/utils/fetch-facets';

export function getNextOrderingUrl(
  ordering:
    { current: string; options: Array<{ name: string; text: string; url: string }> } | undefined,
  sortKey: string | undefined
): string | undefined {
  if (!ordering || !sortKey) return undefined;
  // Columns declare sortKey in the `_exact` convention used for filters, but the
  // server emits canonical ordering option names (e.g. `name`/`-name`). Strip the
  // suffix so the lookup matches — otherwise it never finds an option (dead branch).
  const canonicalKey = canonicalSortAttribute(sortKey);
  const group = ordering.options.filter(
    (option) => option.name === canonicalKey || option.name === `-${canonicalKey}`
  );
  return group.find((option) => option.name !== ordering.current)?.url ?? group[0]?.url;
}

export function useSearchQuery(opts: {
  initialQueryState: QueryState;
  resultType: ResultType;
  baseFacetURL: string;
  submittedKeyword: string;
  ordering: SearchResult['ordering'];
  setDraftKeyword: (value: string) => void;
  setSubmittedKeyword: (value: string) => void;
  handleClearKeyword: () => void;
}) {
  const {
    initialQueryState,
    resultType,
    baseFacetURL,
    submittedKeyword,
    ordering,
    setDraftKeyword,
    setSubmittedKeyword,
    handleClearKeyword,
  } = opts;

  const [queryState, setQueryState] = React.useState<QueryState>(initialQueryState);
  const [sortKey, setSortKey] = React.useState<string | null>(null);
  const [ascending, setAscending] = React.useState(true);

  // Use a ref for ordering so handleSort always sees the latest value
  const orderingRef = React.useRef(ordering);
  React.useEffect(() => {
    orderingRef.current = ordering;
  }, [ordering]);

  const handleFacetClick = React.useCallback(
    (arg: string, action?: FacetClickAction) => {
      setQueryState((prev) => {
        const resolution = resolveFacetClick({ arg, action, queryState: prev, baseFacetURL });
        if (resolution.type === 'keyword') {
          setDraftKeyword(resolution.value);
          setSubmittedKeyword(resolution.value);
        }
        return resolution.type === 'query' ? resolution.value : prev;
      });
    },
    [baseFacetURL, setDraftKeyword, setSubmittedKeyword]
  );

  const handlePage = React.useCallback((page: number) => {
    setQueryState((prev) => withOffset(prev, (page - 1) * prev.limit));
  }, []);

  const handleLimitChange = React.useCallback((newLimit: number) => {
    setQueryState((prev) => withLimit(prev, newLimit));
  }, []);

  const handleClearAllFilters = React.useCallback(() => {
    setQueryState((prev) => clearAllFacetFilters(prev));
  }, []);

  const handleClearDateFiltersLocal = React.useCallback(() => {
    setQueryState((prev) => clearDateFilters(prev));
  }, []);

  const activeTags = React.useMemo<ActiveFacetTag[]>(() => {
    return buildActiveQueryTags({
      submittedKeyword,
      dateParams: queryState.dateParams,
      selectedFacets: queryState.selected_facets,
      searchType: resultType,
      extraParams: queryState.extraParams,
    });
  }, [
    submittedKeyword,
    queryState.dateParams,
    queryState.selected_facets,
    queryState.extraParams,
    resultType,
  ]);
  const activeFilterCount = activeTags.length;

  const handleRemoveTag = React.useCallback(
    (item: ActiveFacetTag) => {
      const specialRemovers: Record<string, () => void> = {
        __keyword__: handleClearKeyword,
        __date__: handleClearDateFiltersLocal,
      };
      const remove = specialRemovers[item.facetKey];
      if (remove) return remove();
      if (item.exclude) {
        setQueryState((prev) => removeExclusionFromExtraParams(prev, item.facetKey, item.value));
        return;
      }
      handleFacetClick('', { type: 'deselectFacet', facetKey: item.facetKey, value: item.value });
    },
    [handleClearDateFiltersLocal, handleClearKeyword, handleFacetClick]
  );

  const handleSort = React.useCallback(
    (opts: { sortKey?: string; sortUrl?: string }) => {
      const { sortKey: ck, sortUrl } = opts;
      const nextOrderingUrl = sortUrl ? getNextOrderingUrl(orderingRef.current, ck) : undefined;
      if (nextOrderingUrl) {
        setQueryState(stateFromUrl(nextOrderingUrl, baseFacetURL));
        return;
      }
      if (sortUrl) {
        setQueryState(stateFromUrl(sortUrl, baseFacetURL));
        return;
      }
      if (ck) {
        // Canonicalise before comparing AND before storing: columns hand us the
        // `_exact` filter form while the dropdown (handleSortChange) writes the
        // bare attribute. Comparing the two conventions makes every other click
        // look like a *different* column and resets to ascending instead of
        // toggling. The backend strips `_exact` anyway, so the canonical form is
        // also the more honest thing to put in the URL.
        const canonicalKey = canonicalSortAttribute(ck);
        const nextAsc = canonicalKey === sortKey ? !ascending : true;
        setSortKey(canonicalKey);
        setAscending(nextAsc);
        setQueryState((prev) => ({
          ...prev,
          ordering: formatOrdering(canonicalKey, !nextAsc),
          offset: 0,
        }));
      }
    },
    [sortKey, ascending, baseFacetURL]
  );

  /**
   * Set the sort outright, as opposed to `handleSort`'s toggle semantics (which
   * exist for column-header clicks). Used by the Sort-by dropdown, which is
   * available in every view mode — including grid, where there are no headers to
   * click. `attribute: null` clears back to relevance.
   *
   * Mirrors the choice into the local sortKey/ascending bookkeeping so a
   * subsequent column-header click toggles from what the user just picked
   * instead of from stale state — which only holds because both paths store the
   * canonical attribute (see `handleSort`).
   */
  const handleSortChange = React.useCallback(
    (next: { attribute: string | null; descending: boolean }) => {
      const { descending } = next;
      const attribute = next.attribute ? canonicalSortAttribute(next.attribute) : null;
      setSortKey(attribute);
      setAscending(!descending);
      setQueryState((prev) => ({
        ...prev,
        ordering: attribute ? formatOrdering(attribute, descending) : null,
        // Re-sorting while stranded on page 7 shows a slice of the new order
        // that looks arbitrary; always land back on the first page.
        offset: 0,
      }));
    },
    []
  );

  return {
    queryState,
    setQueryState,
    sortKey,
    ascending,
    activeTags,
    activeFilterCount,
    handleFacetClick,
    handlePage,
    handleLimitChange,
    handleClearAllFilters,
    handleClearDateFilters: handleClearDateFiltersLocal,
    handleRemoveTag,
    handleSort,
    handleSortChange,
  };
}
