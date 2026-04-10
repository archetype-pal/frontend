'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import { getCrossTypeLinks, type ResultType } from '@/lib/search-types';
import { useSiteFeatures } from '@/contexts/site-features-context';
import { useModelLabels } from '@/contexts/model-labels-context';
import { useSearchResults } from '@/hooks/search/use-search-results';
import { stateFromSearchParams } from '@/lib/search-query';
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
import { useSearchCompare } from '@/hooks/search/use-search-compare';
import { useSearchExport } from '@/hooks/search/use-search-export';
import { useSearchUrlSync } from '@/hooks/search/use-search-url-sync';
import { useSearchHotkeys } from '@/hooks/search/use-search-hotkeys';
import { useSearchData } from '@/hooks/search/use-search-data';

export function useSearchPageState(initialType?: ResultType) {
  const searchParams = useSearchParams();
  const { getLabel } = useModelLabels();
  const resultsScrollRef = React.useRef<HTMLDivElement | null>(null);
  const [resultType, setResultType] = React.useState<ResultType>(initialType ?? 'manuscripts');
  const [advancedSearch, setAdvancedSearch] = React.useState<AdvancedSearchState>(
    DEFAULT_ADVANCED_SEARCH_STATE
  );
  const { enabledCategories, getCategoryConfig } = useSiteFeatures();
  const categoryConfig = getCategoryConfig(resultType);
  // Track previous ordering from search results so it can be passed to useSearchQuery.
  // On the first render ordering is undefined; it gets populated once data loads.
  const orderingRef = React.useRef<
    { current: string; options: Array<{ name: string; text: string; url: string }> } | undefined
  >(undefined);

  React.useEffect(() => {
    if (initialType != null) setResultType(initialType);
  }, [initialType]);

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

  const { data, isFetching, isLoading } = useSearchResults(
    resultType,
    queryHook.queryState,
    submittedKeyword
  );

  // Keep the ordering ref up to date for handleSort
  orderingRef.current = data.ordering;

  const filtered = data.results;
  const timelineDistribution = data.facetDistribution?.date_min ?? {};
  const cityDistribution = data.facetDistribution?.repository_city ?? {};

  const compareHook = useSearchCompare({ resultType, filtered });

  const exportHook = useSearchExport({
    queryState: queryHook.queryState,
    resultType,
    submittedKeyword,
    getLabel,
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
    compareIds: compareHook.compareIds,
    viewMode,
    setQueryState: queryHook.setQueryState,
    setDraftKeyword,
    setSubmittedKeyword,
    setCompareIds: compareHook.setCompareIds,
    setAdvancedSearch,
    setViewMode,
  });

  // --- Scroll to top on navigation ---

  React.useEffect(() => {
    const el = resultsScrollRef.current;
    if (el) el.scrollTo({ top: 0 });
  }, [resultType, queryHook.queryState.offset, viewMode]);

  // --- handleResultTypeChange (resets state across multiple hooks) ---

  const handleResultTypeChange = React.useCallback(
    (next: ResultType) => {
      setResultType(next);
      queryHook.setQueryState((prev) => ({
        ...prev,
        selected_facets: [],
        dateParams: {},
        extraParams: {},
        offset: 0,
      }));
      compareHook.clearCompareIds();
      setAdvancedSearch(DEFAULT_ADVANCED_SEARCH_STATE);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- stable refs from sub-hooks
    [queryHook.setQueryState, compareHook.clearCompareIds]
  );

  // --- Computed values ---

  const showGridToggle = !isTableOnlyType(resultType);
  const hasTimelineData = timelineDistribution && Object.keys(timelineDistribution).length > 0;
  const showTimelineToggle = !isTableOnlyType(resultType);
  const showDistributionToggle = true;
  const distributionEnabled = resultType === 'graphs';
  const showMapToggle = !isTableOnlyType(resultType);
  const resultCount = data.count;
  const crossTypeLinks = React.useMemo(() => getCrossTypeLinks(resultType), [resultType]);

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
    // Refs
    resultsScrollRef,
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
    shareFeedback: exportHook.shareFeedback,
    exportBusy: exportHook.exportBusy,
    advancedSearch,
    setAdvancedSearch,
    exactPhraseKeyword,
    setExactPhraseKeyword,
    compareIds: compareHook.compareIds,
    compareOpen: compareHook.compareOpen,
    setCompareOpen: compareHook.setCompareOpen,
    filtersSidebarCollapsed,
    toggleFiltersSidebar,
    // Data
    baseFacetURL,
    data,
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
    crossTypeLinks,
    compareEnabled: compareHook.compareEnabled,
    selectedCompareItems: compareHook.selectedCompareItems,
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
    handleShareSearch: exportHook.handleShareSearch,
    handleExport: exportHook.handleExport,
    toggleCompare: compareHook.toggleCompare,
    // Config
    enabledCategories,
    categoryConfig,
  };
}
