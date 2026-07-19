'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import { SEARCH_RESULT_TYPES, type ResultType } from '@/lib/search-types';
import { useSiteFeatures } from '@/contexts/site-features-context';
import { useAuth } from '@/contexts/auth-context';
import { useSearchVisibility } from '@/lib/search-visibility';
import { useModelLabels } from '@/contexts/model-labels-context';
import { useSearchResults } from '@/hooks/search/use-search-results';
import { resetQueryForTypeChange, stateFromSearchParams } from '@/lib/search-query';
import { isOrderingUnsupported } from '@/lib/search-sort';
import {
  DEFAULT_ADVANCED_SEARCH_STATE,
  type AdvancedSearchState,
} from '@/components/search/advanced-search-panel';
import {
  areExtraParamsEqual,
  buildAdvancedExtraParams,
  mergeAdvancedIntoExtraParams,
  stripAdvancedExtraParams,
} from '@/lib/search-query';
import { getSearchBaseFacetUrl } from '@/utils/fetch-facets';
import { isTableOnlyType } from '@/hooks/search/use-search-view-mode';
import { useSearchViewMode } from '@/hooks/search/use-search-view-mode';
import { useSearchKeyword } from '@/hooks/search/use-search-keyword';
import { useSearchQuery } from '@/hooks/search/use-search-query';
import { useSearchMobileFilters } from '@/hooks/search/use-search-mobile-filters';
import { useSearchExport } from '@/hooks/search/use-search-export';
import { useSearchUrlSync } from '@/hooks/search/use-search-url-sync';
import { useSearchHotkeys } from '@/hooks/search/use-search-hotkeys';
import { useSearchData } from '@/hooks/search/use-search-data';

export function useSearchPageState(initialType?: ResultType) {
  const searchParams = useSearchParams();
  const { getLabel } = useModelLabels();
  const [resultType, setResultType] = React.useState<ResultType>(initialType ?? 'manuscripts');
  const [advancedSearch, setAdvancedSearch] = React.useState<AdvancedSearchState>(
    DEFAULT_ADVANCED_SEARCH_STATE
  );
  const { enabledCategories: guestEnabledCategories } = useSiteFeatures();
  const { token } = useAuth();
  const visibility = useSearchVisibility(resultType);
  const enabledCategories = React.useMemo(
    () => (token ? [...SEARCH_RESULT_TYPES] : guestEnabledCategories),
    [token, guestEnabledCategories]
  );
  const categoryConfig = React.useMemo(
    () => ({
      enabled: true,
      visibleColumns: visibility.visibleColumns,
      visibleFacets: visibility.visibleFacets,
    }),
    [visibility.visibleColumns, visibility.visibleFacets]
  );
  // Track previous ordering from search results so it can be passed to useSearchQuery.
  // On the first render ordering is undefined; it gets populated once data loads.
  const orderingRef = React.useRef<
    { current: string; options: Array<{ name: string; text: string; url: string }> } | undefined
  >(undefined);

  // Adjust resultType when the initialType prop changes (store-during-render
  // pattern from https://react.dev/learn/you-might-not-need-an-effect). Tracks
  // the previously-seen prop so a change re-seeds resultType while still letting
  // local handlers (handleResultTypeChange) override it between prop changes.
  const prevInitialTypeRef = React.useRef(initialType);
  if (initialType != null && initialType !== prevInitialTypeRef.current) {
    prevInitialTypeRef.current = initialType;
    setResultType(initialType);
  }

  const baseFacetURL = React.useMemo(() => getSearchBaseFacetUrl(resultType), [resultType]);

  // --- Sub-hooks ---

  const { viewMode, setViewMode, filtersSidebarCollapsed, toggleFiltersSidebar } =
    useSearchViewMode(resultType);

  const {
    draftKeyword,
    setDraftKeyword,
    submittedKeyword,
    setSubmittedKeyword,
    exactPhraseKeyword,
    setExactPhraseKeyword,
    handleClearKeyword,
  } = useSearchKeyword(searchParams.get('keyword') ?? '', resultType);

  const queryHook = useSearchQuery({
    initialQueryState: stateFromSearchParams(searchParams),
    resultType,
    baseFacetURL,
    submittedKeyword,
    ordering: orderingRef.current,
    setDraftKeyword,
    setSubmittedKeyword,
    handleClearKeyword,
  });

  const { data, dataResultType, isFetching, isLoading } = useSearchResults(
    resultType,
    queryHook.queryState,
    submittedKeyword
  );

  // Keep the ordering ref up to date for handleSort
  orderingRef.current = data.ordering;

  // --- Sort fields are per-index ---

  // `keepPreviousData` keeps the OUTGOING index's `ordering` on screen while the
  // new type's response is in flight, so the Sort-by control would offer fields
  // (Scribe, Allograph…) the incoming index has never heard of — and picking one
  // writes an attribute the backend silently drops. Withhold the block until the
  // response for the type actually being displayed arrives.
  const sortOrdering = dataResultType === resultType ? data.ordering : undefined;

  // Self-heal an `ordering` this index rejects: a bookmarked `?ordering=scribe`
  // opened on /search/manuscripts, or a field picked during the window above.
  // Left alone the control shows "Relevance" while the URL keeps re-sending the
  // dead attribute on every request. Guarded to a settled block for the current
  // type (`sortOrdering`), and clearing writes null, which fails the first guard
  // on the next pass — it cannot loop, nor override a choice the user made from
  // this same option list.
  const { setQueryState } = queryHook;
  const currentOrdering = queryHook.queryState.ordering;
  React.useEffect(() => {
    if (!isOrderingUnsupported(currentOrdering, sortOrdering)) return;
    setQueryState((prev) =>
      prev.ordering === currentOrdering ? { ...prev, ordering: null } : prev
    );
  }, [currentOrdering, sortOrdering, setQueryState]);

  const filtered = data.results;
  const timelineDistribution = data.facetDistribution?.date_min ?? {};
  const cityDistribution = data.facetDistribution?.repository_city ?? {};

  const exportHook = useSearchExport({
    queryState: queryHook.queryState,
    resultType,
    submittedKeyword,
    getLabel,
    visibleColumns: visibility.visibleColumns,
  });

  const mobileHook = useSearchMobileFilters({
    queryState: queryHook.queryState,
    draftKeyword,
    resultType,
    baseFacetURL,
  });

  const dataHook = useSearchData({
    resultType,
    baseFacetURL,
    queryState: queryHook.queryState,
    submittedKeyword,
    viewMode,
    dataCount: data.count,
    results: data.results,
  });

  // --- Advanced search sync ---

  React.useEffect(() => {
    queryHook.setQueryState((prev) => {
      const withoutAdv = stripAdvancedExtraParams(prev.extraParams);
      if (!advancedSearch.enabled) {
        if (areExtraParamsEqual(prev.extraParams, withoutAdv)) return prev;
        return { ...prev, extraParams: withoutAdv, offset: 0 };
      }
      const nextExtra = mergeAdvancedIntoExtraParams(
        withoutAdv,
        buildAdvancedExtraParams({
          enabled: true,
          matchingStrategy: advancedSearch.matchingStrategy,
          searchField: advancedSearch.searchField,
          queryRoot: advancedSearch.queryRoot,
        })
      );
      if (areExtraParamsEqual(prev.extraParams, nextExtra)) return prev;
      return { ...prev, extraParams: nextExtra, offset: 0 };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [advancedSearch]);

  // --- URL sync ---

  useSearchUrlSync({
    resultType,
    queryState: queryHook.queryState,
    submittedKeyword,
    advancedSearchEnabled: advancedSearch.enabled,
    viewMode,
    setQueryState: queryHook.setQueryState,
    setDraftKeyword,
    setSubmittedKeyword,
    setAdvancedSearch,
    setViewMode,
  });

  // --- Scroll to top on navigation ---
  // The page now flows in the document (no internal scroll container), so a
  // page change / type switch scrolls the window back to the top.

  React.useEffect(() => {
    if (typeof window !== 'undefined') window.scrollTo({ top: 0 });
  }, [resultType, queryHook.queryState.offset, viewMode]);

  // --- handleResultTypeChange (resets state across multiple hooks) ---

  const handleResultTypeChange = React.useCallback(
    (next: ResultType) => {
      setResultType(next);
      // Full clean slate: facets, date, exclusions, sort ordering, and page offset
      // are all per-type — carrying them into the next type lands on an
      // out-of-range page or applies a stale sort. (Keyword is kept: the per-type
      // tab counts are keyword-scoped.)
      queryHook.setQueryState((prev) => resetQueryForTypeChange(prev));
      setAdvancedSearch(DEFAULT_ADVANCED_SEARCH_STATE);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- stable refs from sub-hooks
    [queryHook.setQueryState]
  );

  // --- Computed values ---

  const showGridToggle = !isTableOnlyType(resultType);
  const hasTimelineData = timelineDistribution && Object.keys(timelineDistribution).length > 0;
  const showTimelineToggle = !isTableOnlyType(resultType);
  const showDistributionToggle = true;
  const distributionEnabled = resultType === 'graphs';
  const showMapToggle = !isTableOnlyType(resultType);
  const resultCount = data.count;

  // --- Hotkeys ---

  useSearchHotkeys({
    resultType,
    hasTimelineData,
    setDraftKeyword,
    setViewMode,
    handleResultTypeChange,
    toggleFiltersSidebar,
  });

  return {
    // State
    viewMode,
    setViewMode,
    resultType,
    queryState: queryHook.queryState,
    setQueryState: queryHook.setQueryState,
    draftKeyword,
    setDraftKeyword,
    submittedKeyword,
    setSubmittedKeyword,
    exportBusy: exportHook.exportBusy,
    advancedSearch,
    setAdvancedSearch,
    exactPhraseKeyword,
    setExactPhraseKeyword,
    filtersSidebarCollapsed,
    toggleFiltersSidebar,
    // Data
    baseFacetURL,
    data,
    sortOrdering,
    isFetching,
    isLoading,
    filtered,
    timelineDistribution,
    cityDistribution,
    countsByType: dataHook.countsByType,
    graphDistributionQuery: dataHook.graphDistributionQuery,
    // Computed
    activeTags: queryHook.activeTags,
    activeFilterCount: queryHook.activeFilterCount,
    showGridToggle,
    hasTimelineData,
    showTimelineToggle,
    showDistributionToggle,
    distributionEnabled,
    showMapToggle,
    resultCount,
    // Mobile
    mobileQueryDraft: mobileHook.mobileQueryDraft,
    setMobileQueryDraft: mobileHook.setMobileQueryDraft,
    mobileKeywordDraft: mobileHook.mobileKeywordDraft,
    setMobileKeywordDraft: mobileHook.setMobileKeywordDraft,
    mobileActiveTags: mobileHook.mobileActiveTags,
    // Handlers
    handleResultTypeChange,
    handleFacetClick: queryHook.handleFacetClick,
    handleMobileFacetClick: mobileHook.handleMobileFacetClick,
    handlePage: queryHook.handlePage,
    handleLimitChange: queryHook.handleLimitChange,
    handleClearAllFilters: queryHook.handleClearAllFilters,
    handleClearKeyword,
    handleClearDateFilters: queryHook.handleClearDateFilters,
    handleRemoveTag: queryHook.handleRemoveTag,
    handleSort: queryHook.handleSort,
    handleSortChange: queryHook.handleSortChange,
    handleExport: exportHook.handleExport,
    handleFormattedExport: exportHook.handleFormattedExport,
    // Config
    enabledCategories,
    categoryConfig,
    visibility,
  };
}
