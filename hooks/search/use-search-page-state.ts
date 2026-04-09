'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import { useQueries, useQuery } from '@tanstack/react-query';
import type { FacetClickAction } from '@/types/facets';
import { useSearchContext } from '@/contexts/search-context';
import { useSiteFeatures } from '@/contexts/site-features-context';
import {
  SEARCH_RESULT_CONFIG,
  getCrossTypeLinks,
  resultTypeItems,
  type ResultType,
} from '@/lib/search-types';
import { resolveResultTypeLabel } from '@/lib/search-label-helpers';
import { useModelLabels } from '@/contexts/model-labels-context';
import { useSearchResults } from '@/hooks/search/use-search-results';
import {
  areExtraParamsEqual,
  buildActiveQueryTags,
  buildAdvancedExtraParams,
  buildQueryString,
  clearAllFacetFilters,
  clearDateFilters,
  mergeAdvancedIntoExtraParams,
  parseQueryRootFromUrl,
  removeExclusionFromExtraParams,
  stripAdvancedExtraParams,
  type ActiveFacetTag,
  getSuggestionsPool,
  type QueryState,
  resolveFacetClick,
  stateFromSearchParams,
  stateFromUrl,
  withLimit,
  withOffset,
} from '@/lib/search-query';
import {
  AdvancedSearchPanel,
  DEFAULT_ADVANCED_SEARCH_STATE,
  type AdvancedSearchState,
} from '@/components/search/advanced-search-panel';
import {
  fetchCount,
  fetchFacetsAndResults,
  getSearchBaseFacetUrl,
  searchKeys,
} from '@/utils/fetch-facets';
import { API_BASE_URL } from '@/lib/api-fetch';
import { toast } from 'sonner';
import { useHotkeys } from '@/hooks/use-hotkeys';
import { addSearchHistory } from '@/lib/search-history';
import type { ViewMode } from '@/components/search/search-actions-menu';

const TABLE_ONLY_TYPES: readonly ResultType[] = ['texts', 'people', 'places'];
const TABLE_ONLY_TYPE_SET = new Set<ResultType>(TABLE_ONLY_TYPES);
const VIEW_PREFS_KEY = 'search-view-prefs';
const FILTERS_SIDEBAR_COLLAPSED_KEY = 'search-filters-sidebar-collapsed';
const MAX_COMPARE_ITEMS = 3;

function isTableOnlyType(type: ResultType): boolean {
  return TABLE_ONLY_TYPE_SET.has(type);
}

function getNextOrderingUrl(
  ordering:
    | { current: string; options: Array<{ name: string; text: string; url: string }> }
    | undefined,
  sortKey: string | undefined
): string | undefined {
  if (!ordering) return undefined;
  const group = ordering.options.filter((option) => option.name.endsWith(sortKey ?? ''));
  return group.find((option) => option.name !== ordering.current)?.url ?? group[0]?.url;
}

function parseViewModeParam(raw: string | null, resultType: ResultType): ViewMode | null {
  if (!raw) return null;
  const v = raw as ViewMode;
  const allowed: ViewMode[] = ['table', 'grid', 'timeline', 'distribution', 'map'];
  if (!allowed.includes(v)) return null;
  if (v === 'distribution' && resultType !== 'graphs') return null;
  if ((v === 'map' || v === 'grid') && isTableOnlyType(resultType)) return null;
  return v;
}

export function useSearchPageState(initialType?: ResultType) {
  const searchParams = useSearchParams();
  const { getLabel } = useModelLabels();
  const resultsScrollRef = React.useRef<HTMLDivElement | null>(null);
  const isInternalUrlUpdate = React.useRef(false);
  const [viewMode, setViewMode] = React.useState<ViewMode>('table');
  const [resultType, setResultType] = React.useState<ResultType>(initialType ?? 'manuscripts');
  const [queryState, setQueryState] = React.useState<QueryState>(() =>
    stateFromSearchParams(searchParams)
  );
  const [draftKeyword, setDraftKeyword] = React.useState<string>(
    () => searchParams.get('keyword') ?? ''
  );
  const [submittedKeyword, setSubmittedKeyword] = React.useState<string>(
    () => searchParams.get('keyword') ?? ''
  );
  const [sortKey, setSortKey] = React.useState<string | null>(null);
  const [ascending, setAscending] = React.useState(true);
  const [shareFeedback, setShareFeedback] = React.useState<'idle' | 'copied' | 'error'>('idle');
  const [exportBusy, setExportBusy] = React.useState(false);
  const [advancedSearch, setAdvancedSearch] = React.useState<AdvancedSearchState>(
    DEFAULT_ADVANCED_SEARCH_STATE
  );
  const [exactPhraseKeyword, setExactPhraseKeyword] = React.useState(false);
  const [compareIds, setCompareIds] = React.useState<string[]>([]);
  const [compareOpen, setCompareOpen] = React.useState(false);
  const [filtersSidebarCollapsed, setFiltersSidebarCollapsed] = React.useState(false);
  const { setSuggestionsPool } = useSearchContext();
  const { enabledCategories, getCategoryConfig } = useSiteFeatures();
  const categoryConfig = getCategoryConfig(resultType);

  // --- Effects ---

  React.useEffect(() => {
    if (initialType != null) setResultType(initialType);
  }, [initialType]);

  React.useEffect(() => {
    try {
      const raw = window.localStorage.getItem(FILTERS_SIDEBAR_COLLAPSED_KEY);
      if (raw === 'true') setFiltersSidebarCollapsed(true);
    } catch {
      // ignore
    }
  }, []);

  const toggleFiltersSidebar = React.useCallback(() => {
    setFiltersSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(FILTERS_SIDEBAR_COLLAPSED_KEY, next ? 'true' : 'false');
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  React.useEffect(() => {
    try {
      const raw = window.localStorage.getItem(VIEW_PREFS_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Record<string, ViewMode>;
      const candidate = parsed[resultType];
      if (!candidate) return;
      if (candidate === 'distribution' && resultType !== 'graphs') return;
      if (candidate === 'map' && isTableOnlyType(resultType)) return;
      if (candidate === 'grid' && isTableOnlyType(resultType)) return;
      setViewMode(candidate);
    } catch {
      // ignore invalid persisted prefs
    }
  }, [resultType]);

  React.useEffect(() => {
    if (isInternalUrlUpdate.current) {
      isInternalUrlUpdate.current = false;
      return;
    }
    const kw = searchParams.get('keyword');
    const value = kw ?? '';
    setDraftKeyword(value);
    setSubmittedKeyword(value);
    setQueryState(stateFromSearchParams(searchParams));
    const compareRaw = searchParams.get('compare') ?? '';
    setCompareIds(
      compareRaw
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean)
    );
    const notFacetEntry =
      Array.from(searchParams.entries()).find(([key]) => key.endsWith('__not')) ?? null;
    const rangeMinEntry =
      Array.from(searchParams.entries()).find(([key]) => key.endsWith('__min')) ?? null;
    const rangeMaxEntry =
      Array.from(searchParams.entries()).find(([key]) => key.endsWith('__max')) ?? null;
    const viewFromUrl = parseViewModeParam(searchParams.get('view'), resultType);
    if (viewFromUrl) setViewMode(viewFromUrl);
    setAdvancedSearch((prev) => ({
      ...prev,
      enabled:
        searchParams.get('advanced') === 'true' ||
        searchParams.get('matching_strategy') != null ||
        searchParams.get('search_field') != null ||
        searchParams.get('qb') != null ||
        notFacetEntry != null ||
        rangeMinEntry != null ||
        rangeMaxEntry != null,
      matchingStrategy:
        searchParams.get('matching_strategy') === 'last'
          ? 'last'
          : searchParams.get('matching_strategy') === 'all'
            ? 'all'
            : prev.matchingStrategy,
      searchField: searchParams.get('search_field') ?? '',
      queryRoot: parseQueryRootFromUrl(searchParams),
    }));
  }, [searchParams, resultType]);

  React.useEffect(() => {
    const qs = buildQueryString(queryState);
    const params = new URLSearchParams(qs);
    if (submittedKeyword) params.set('keyword', submittedKeyword);
    if (advancedSearch.enabled) params.set('advanced', 'true');
    if (compareIds.length > 0) {
      params.set('compare', compareIds.join(','));
    }
    if (viewMode !== 'table') {
      params.set('view', viewMode);
    }
    const path = '/search/' + resultType + (params.toString() ? '?' + params.toString() : '');
    const currentPath = window.location.pathname + window.location.search;
    if (path !== currentPath) {
      isInternalUrlUpdate.current = true;
      window.history.replaceState(null, '', path);
    }
  }, [advancedSearch.enabled, compareIds, queryState, resultType, submittedKeyword, viewMode]);

  // --- Data fetching ---

  const handleResultTypeChange = React.useCallback((next: ResultType) => {
    setResultType(next);
    setQueryState((prev) => ({
      ...prev,
      selected_facets: [],
      dateParams: {},
      extraParams: {},
      offset: 0,
    }));
    setCompareIds([]);
    setAdvancedSearch(DEFAULT_ADVANCED_SEARCH_STATE);
  }, []);

  const { baseFacetURL, data, isFetching, isLoading } = useSearchResults(
    resultType,
    queryState,
    submittedKeyword
  );
  const filtered = data.results;
  const timelineDistribution = data.facetDistribution?.date_min ?? {};
  const cityDistribution = data.facetDistribution?.repository_city ?? {};

  const quickStatsQueries = useQueries({
    queries: resultTypeItems.map((item) => {
      const params = new URLSearchParams();
      params.set('limit', '1');
      params.set('offset', '0');
      if (submittedKeyword) params.set('q', submittedKeyword);
      const url = `${getSearchBaseFacetUrl(item.value)}?${params.toString()}`;
      return {
        queryKey: searchKeys.facets(item.value, `${url}|quick-stats`),
        queryFn: async ({ signal }: { signal: AbortSignal }) => fetchCount(item.value, url, signal),
        staleTime: 5 * 60_000,
      };
    }),
  });
  const countsByType = React.useMemo(() => {
    const entries = resultTypeItems.map((item, idx) => [
      item.value,
      quickStatsQueries[idx]?.data ?? 0,
    ]);
    const next = Object.fromEntries(entries) as Record<ResultType, number>;
    next[resultType] = data.count;
    return next;
  }, [data.count, quickStatsQueries, resultType]);

  const graphDistributionQuery = useQuery({
    queryKey: searchKeys.facets(
      'graphs',
      `${baseFacetURL}|dist|${buildQueryString(queryState)}|${submittedKeyword}`
    ),
    enabled: resultType === 'graphs' && viewMode === 'distribution',
    queryFn: async () => {
      const params = new URLSearchParams(buildQueryString(queryState));
      if (submittedKeyword) params.set('q', submittedKeyword);
      params.set('facets', 'date_min,repository_name,hand_name,component_features');
      params.set('limit', '1');
      const url = `${baseFacetURL}?${params.toString()}`;
      return fetchFacetsAndResults('graphs', url);
    },
    staleTime: 10_000,
  });

  // --- Side effects ---

  React.useEffect(() => {
    setSuggestionsPool(getSuggestionsPool(data.results));
    return () => setSuggestionsPool([]);
  }, [data.results, setSuggestionsPool]);

  React.useEffect(() => {
    if (isTableOnlyType(resultType) && viewMode !== 'table') setViewMode('table');
    if (resultType !== 'graphs' && viewMode === 'distribution') setViewMode('table');
    if (isTableOnlyType(resultType) && viewMode === 'map') setViewMode('table');
  }, [resultType, viewMode]);

  React.useEffect(() => {
    try {
      const raw = window.localStorage.getItem(VIEW_PREFS_KEY);
      const parsed = raw ? (JSON.parse(raw) as Record<string, ViewMode>) : {};
      parsed[resultType] = viewMode;
      window.localStorage.setItem(VIEW_PREFS_KEY, JSON.stringify(parsed));
    } catch {
      // ignore persistence failures
    }
  }, [resultType, viewMode]);

  React.useEffect(() => {
    const el = resultsScrollRef.current;
    if (el) el.scrollTo({ top: 0 });
  }, [resultType, queryState.offset, viewMode]);

  // --- Callbacks ---

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
    [baseFacetURL]
  );

  const handleMobileFacetClick = React.useCallback(
    (arg: string, action?: FacetClickAction) => {
      setMobileQueryDraft((prev) => {
        const resolution = resolveFacetClick({ arg, action, queryState: prev, baseFacetURL });
        if (resolution.type === 'keyword') {
          setMobileKeywordDraft(resolution.value);
        }
        return resolution.type === 'query' ? resolution.value : prev;
      });
    },
    [baseFacetURL]
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

  const handleClearKeyword = React.useCallback(() => {
    setDraftKeyword('');
    setSubmittedKeyword('');
  }, []);

  React.useEffect(() => {
    const normalized = submittedKeyword.trim();
    if (!normalized) return;
    addSearchHistory(normalized, resultType);
  }, [submittedKeyword, resultType]);

  const handleClearDateFilters = React.useCallback(() => {
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

  // Mobile filter state
  const [mobileQueryDraft, setMobileQueryDraft] = React.useState<QueryState>(queryState);
  const [mobileKeywordDraft, setMobileKeywordDraft] = React.useState(draftKeyword);
  React.useEffect(() => {
    setMobileQueryDraft(queryState);
    setMobileKeywordDraft(draftKeyword);
  }, [draftKeyword, queryState]);
  const mobileActiveTags = React.useMemo<ActiveFacetTag[]>(() => {
    return buildActiveQueryTags({
      submittedKeyword: mobileKeywordDraft,
      dateParams: mobileQueryDraft.dateParams,
      selectedFacets: mobileQueryDraft.selected_facets,
      searchType: resultType,
      extraParams: mobileQueryDraft.extraParams,
    });
  }, [
    mobileKeywordDraft,
    mobileQueryDraft.dateParams,
    mobileQueryDraft.selected_facets,
    mobileQueryDraft.extraParams,
    resultType,
  ]);

  React.useEffect(() => {
    setQueryState((prev) => {
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
  }, [advancedSearch]);

  React.useEffect(() => {
    if (shareFeedback === 'idle') return;
    const timer = window.setTimeout(() => setShareFeedback('idle'), 1800);
    return () => window.clearTimeout(timer);
  }, [shareFeedback]);

  const handleRemoveTag = React.useCallback(
    (item: ActiveFacetTag) => {
      const specialRemovers: Record<string, () => void> = {
        __keyword__: handleClearKeyword,
        __date__: handleClearDateFilters,
      };
      const remove = specialRemovers[item.facetKey];
      if (remove) return remove();
      if (item.exclude) {
        setQueryState((prev) => removeExclusionFromExtraParams(prev, item.facetKey, item.value));
        return;
      }
      handleFacetClick('', { type: 'deselectFacet', facetKey: item.facetKey, value: item.value });
    },
    [handleClearDateFilters, handleClearKeyword, handleFacetClick]
  );

  const handleSort = React.useCallback(
    (opts: { sortKey?: string; sortUrl?: string }) => {
      const { sortKey: ck, sortUrl } = opts;
      const nextOrderingUrl = sortUrl ? getNextOrderingUrl(data.ordering, ck) : undefined;
      if (nextOrderingUrl) {
        setQueryState(stateFromUrl(nextOrderingUrl, baseFacetURL));
        return;
      }
      if (sortUrl) {
        setQueryState(stateFromUrl(sortUrl, baseFacetURL));
        return;
      }
      if (ck) {
        const nextAsc = ck === sortKey ? !ascending : true;
        setSortKey(ck);
        setAscending(nextAsc);
        setQueryState((prev) => ({
          ...prev,
          ordering: `${nextAsc ? '' : '-'}${ck}`,
          offset: 0,
        }));
      }
    },
    [data.ordering, sortKey, ascending, baseFacetURL]
  );

  // --- Computed values ---

  const showGridToggle = !isTableOnlyType(resultType);
  const hasTimelineData = timelineDistribution && Object.keys(timelineDistribution).length > 0;
  const showTimelineToggle = !isTableOnlyType(resultType);
  const showDistributionToggle = true;
  const distributionEnabled = resultType === 'graphs';
  const showMapToggle = !isTableOnlyType(resultType);
  const resultCount = data.count;

  const handleShareSearch = React.useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setShareFeedback('copied');
    } catch {
      setShareFeedback('error');
    }
  }, []);

  const crossTypeLinks = React.useMemo(() => getCrossTypeLinks(resultType), [resultType]);
  const compareEnabled = resultType === 'manuscripts' || resultType === 'graphs';
  const selectedCompareItems = React.useMemo(() => {
    if (!compareEnabled) return [];
    const selected = (filtered as Array<{ id: string | number }>).filter((item) =>
      compareIds.includes(String(item.id))
    );
    return selected.slice(0, MAX_COMPARE_ITEMS);
  }, [compareEnabled, compareIds, filtered]);

  const toggleCompare = React.useCallback((id: string | number) => {
    const normalized = String(id);
    setCompareIds((prev) => {
      if (prev.includes(normalized)) return prev.filter((item) => item !== normalized);
      if (prev.length >= MAX_COMPARE_ITEMS) return prev;
      return [...prev, normalized];
    });
  }, []);

  // --- Hotkeys ---

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
    [handleResultTypeChange, hasTimelineData, resultType, toggleFiltersSidebar]
  );

  useHotkeys(searchHotkeys);

  // --- Export ---

  const handleExport = React.useCallback(
    async (format: 'csv' | 'json' | 'bibtex', scope: 'page' | 'all') => {
      setExportBusy(true);
      try {
        const params = new URLSearchParams(buildQueryString(queryState));
        if (submittedKeyword) params.set('q', submittedKeyword);
        params.set('format', format);
        params.set('scope', scope);
        const endpoint = `${API_BASE_URL}/api/v1/search/${SEARCH_RESULT_CONFIG[resultType].apiPath}/export/?${params.toString()}`;
        const res = await fetch(endpoint, { cache: 'no-store' });
        if (!res.ok) throw new Error(`Export failed: ${res.status}`);
        const payload = (await res.json()) as { content?: string; results?: unknown[] };
        const content =
          payload.content ??
          (format === 'json' ? JSON.stringify(payload.results ?? [], null, 2) : '');
        const blob = new Blob([content], {
          type: format === 'json' ? 'application/json' : 'text/plain',
        });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `${resultType}-${scope}.${format === 'bibtex' ? 'bib' : format}`;
        a.click();
        URL.revokeObjectURL(a.href);
        toast.success(
          `Exported ${resolveResultTypeLabel(resultType, getLabel)} as ${format.toUpperCase()}`
        );
      } catch {
        toast.error('Export failed. Try reducing results or choosing another format.');
      } finally {
        setExportBusy(false);
      }
    },
    [queryState, resultType, submittedKeyword, getLabel]
  );

  return {
    // Refs
    resultsScrollRef,
    // State
    viewMode,
    setViewMode,
    resultType,
    queryState,
    setQueryState,
    draftKeyword,
    setDraftKeyword,
    submittedKeyword,
    setSubmittedKeyword,
    shareFeedback,
    exportBusy,
    advancedSearch,
    setAdvancedSearch,
    exactPhraseKeyword,
    setExactPhraseKeyword,
    compareIds,
    compareOpen,
    setCompareOpen,
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
    countsByType,
    graphDistributionQuery,
    // Computed
    activeTags,
    activeFilterCount,
    showGridToggle,
    hasTimelineData,
    showTimelineToggle,
    showDistributionToggle,
    distributionEnabled,
    showMapToggle,
    resultCount,
    crossTypeLinks,
    compareEnabled,
    selectedCompareItems,
    // Mobile
    mobileQueryDraft,
    setMobileQueryDraft,
    mobileKeywordDraft,
    setMobileKeywordDraft,
    mobileActiveTags,
    // Handlers
    handleResultTypeChange,
    handleFacetClick,
    handleMobileFacetClick,
    handlePage,
    handleLimitChange,
    handleClearAllFilters,
    handleClearKeyword,
    handleClearDateFilters,
    handleRemoveTag,
    handleSort,
    handleShareSearch,
    handleExport,
    toggleCompare,
    // Config
    enabledCategories,
    categoryConfig,
  };
}
