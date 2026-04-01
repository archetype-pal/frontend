'use client';

import * as React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Bookmark, Check, MoreVertical, PanelLeftClose, PanelLeftOpen, Share2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ResultsTable } from '@/components/search/results-table';
import { SearchGrid } from '@/components/search/search-grid';
import { DynamicFacets } from '@/components/filters/dynamic-facets';
import { SavedSearchesPanel } from '@/components/search/saved-searches';
import { useSearchContext } from '@/contexts/search-context';
import { useSiteFeatures } from '@/contexts/site-features-context';
import {
  SEARCH_RESULT_CONFIG,
  getCrossTypeLinks,
  resultTypeItems,
  type ResultType,
} from '@/lib/search-types';
import { Pagination } from '@/components/search/paginated-search';
import { useSearchResults } from '@/hooks/search/use-search-results';
import { useQueries, useQuery } from '@tanstack/react-query';
import type { FacetClickAction } from '@/types/facets';
import type { ResultMap } from '@/types/search';
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
import { SearchTimelineView } from '@/components/search/search-timeline-view';
import { SearchDistributionPanel } from '@/components/search/search-distribution-panel';
import {
  AdvancedSearchPanel,
  DEFAULT_ADVANCED_SEARCH_STATE,
  type AdvancedSearchState,
} from '@/components/search/advanced-search-panel';
import { fetchFacetsAndResults, getSearchBaseFacetUrl, searchKeys } from '@/utils/fetch-facets';
import { API_BASE_URL } from '@/lib/api-fetch';
import { toast } from 'sonner';
import { MobileFilterSheet } from '@/components/search/mobile-filter-sheet';
import { SearchMapView } from '@/components/search/search-map-view';
import { useHotkeys } from '@/hooks/use-hotkeys';
import { addSearchHistory } from '@/lib/search-history';
import { ComparisonView } from '@/components/search/comparison-view';
import { cn } from '@/lib/utils';

type ResultListItem = ResultMap[ResultType];
type ViewMode = 'table' | 'grid' | 'timeline' | 'distribution' | 'map';

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

function ResultTypeToggle({
  selectedType,
  onChange,
  enabledTypes,
  counts,
}: {
  selectedType: ResultType;
  onChange: (next: ResultType) => void;
  enabledTypes?: ResultType[];
  counts?: Partial<Record<ResultType, number>>;
}) {
  const items = enabledTypes
    ? resultTypeItems.filter((item) => enabledTypes.includes(item.value))
    : resultTypeItems;

  return (
    <div className="relative min-h-0 w-full min-w-0">
      <div
        className="flex w-full snap-x snap-mandatory gap-0.5 overflow-x-auto scroll-smooth [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="tablist"
        aria-label="Search result type"
      >
        {items.map((item) => {
          const isActive = selectedType === item.value;
          return (
            <button
              key={item.value}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onChange(item.value)}
              className={cn(
                'min-h-8 shrink-0 snap-start whitespace-nowrap border-b-2 px-2 py-1.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:px-2.5 sm:py-2',
                isActive
                  ? 'border-b-primary font-semibold text-foreground'
                  : 'border-b-transparent font-medium text-muted-foreground hover:text-foreground'
              )}
            >
              {item.label}
              {typeof counts?.[item.value] === 'number' && (
                <span className="ml-1 text-xs text-muted-foreground">
                  ({counts[item.value]!.toLocaleString()})
                </span>
              )}
            </button>
          );
        })}
      </div>
      <div
        className="pointer-events-none absolute right-0 top-0 z-[1] h-full w-9 bg-gradient-to-l from-background to-transparent md:hidden"
        aria-hidden
      />
    </div>
  );
}

type SearchActionsMenuProps = {
  triggerId?: string;
  keyword: string;
  filterCount: number;
  resultCount: number;
  viewMode: ViewMode;
  setViewMode: React.Dispatch<React.SetStateAction<ViewMode>>;
  showGridToggle: boolean;
  showTimelineToggle: boolean;
  showDistributionToggle: boolean;
  showMapToggle: boolean;
  hasTimelineData: boolean;
  distributionEnabled: boolean;
  handleShareSearch: () => Promise<void>;
  shareFeedback: 'idle' | 'copied' | 'error';
  advancedEnabled: boolean;
  onToggleAdvanced: () => void;
  orderingOptions: Array<{ name: string; text: string; url: string }> | undefined;
  setQueryState: React.Dispatch<React.SetStateAction<QueryState>>;
  baseFacetURL: string;
  compareEnabled: boolean;
  compareCount: number;
  onOpenCompare: () => void;
  handleExport: (format: 'csv' | 'json' | 'bibtex', scope: 'page' | 'all') => Promise<void>;
  exportBusy: boolean;
  resultType: ResultType;
  crossTypeLinks: readonly ResultType[];
};

function SearchActionsMenu({
  triggerId,
  keyword,
  filterCount,
  resultCount,
  viewMode,
  setViewMode,
  showGridToggle,
  showTimelineToggle,
  showDistributionToggle,
  showMapToggle,
  hasTimelineData,
  distributionEnabled,
  handleShareSearch,
  shareFeedback,
  advancedEnabled,
  onToggleAdvanced,
  orderingOptions,
  setQueryState,
  baseFacetURL,
  compareEnabled,
  compareCount,
  onOpenCompare,
  handleExport,
  exportBusy,
  resultType,
  crossTypeLinks,
}: SearchActionsMenuProps) {
  const [menuOpen, setMenuOpen] = React.useState(false);

  const viewItem = (mode: ViewMode, label: string, disabled?: boolean) => (
    <DropdownMenuItem
      disabled={disabled}
      onClick={() => setViewMode(mode)}
      className="flex items-center gap-2"
    >
      {viewMode === mode ? (
        <Check className="h-4 w-4 shrink-0" />
      ) : (
        <span className="w-4 shrink-0" />
      )}
      {label}
    </DropdownMenuItem>
  );

  return (
    <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          id={triggerId}
          variant="outline"
          size="sm"
          className="h-11 min-h-11 min-w-11 shrink-0 gap-1.5 px-2.5 sm:h-9 sm:min-h-9 sm:min-w-0 sm:px-3"
          title="Search actions — saved searches, view, share, export, and more"
          aria-label="Search actions"
        >
          <MoreVertical className="h-4 w-4 shrink-0" />
          <span className="hidden text-sm sm:inline">Actions</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Bookmark className="mr-2 h-4 w-4" />
            Saved searches
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-80 p-0" sideOffset={6}>
            <SavedSearchesPanel
              resultType={resultType}
              keyword={keyword}
              filterCount={filterCount}
              resultCount={resultCount}
              onNavigate={() => setMenuOpen(false)}
            />
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>View</DropdownMenuLabel>
        {viewItem('table', 'Table')}
        {showGridToggle && viewItem('grid', 'Grid')}
        {showTimelineToggle && viewItem('timeline', 'Timeline', !hasTimelineData)}
        {showDistributionToggle && viewItem('distribution', 'Charts', !distributionEnabled)}
        {showMapToggle && viewItem('map', 'Map')}
        {crossTypeLinks.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Search in</DropdownMenuLabel>
            {crossTypeLinks.map((type) => (
              <DropdownMenuItem key={type} asChild>
                <Link
                  href={`/search/${type}${keyword ? '?keyword=' + encodeURIComponent(keyword) : ''}`}
                  onClick={() => setMenuOpen(false)}
                >
                  {SEARCH_RESULT_CONFIG[type].label}
                </Link>
              </DropdownMenuItem>
            ))}
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => {
            void handleShareSearch();
          }}
        >
          <Share2 className="mr-2 h-4 w-4" />
          {shareFeedback === 'copied'
            ? 'Link copied'
            : shareFeedback === 'error'
              ? 'Copy failed'
              : 'Share link'}
        </DropdownMenuItem>
        <DropdownMenuCheckboxItem
          checked={advancedEnabled}
          onCheckedChange={() => onToggleAdvanced()}
          onSelect={(e) => e.preventDefault()}
        >
          Advanced search
        </DropdownMenuCheckboxItem>
        {orderingOptions && orderingOptions.length > 0 && (
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>Sort</DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              {orderingOptions.map((option) => (
                <DropdownMenuItem
                  key={option.name}
                  onClick={() => setQueryState(stateFromUrl(option.url, baseFacetURL))}
                >
                  {option.text}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        )}
        {compareEnabled && (
          <DropdownMenuItem
            disabled={compareCount < 2}
            onClick={() => {
              setMenuOpen(false);
              onOpenCompare();
            }}
          >
            Compare ({compareCount})
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuSub>
          <DropdownMenuSubTrigger disabled={exportBusy}>Export</DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuItem
              disabled={exportBusy}
              onClick={() => void handleExport('csv', 'page')}
            >
              Export page as CSV
            </DropdownMenuItem>
            <DropdownMenuItem disabled={exportBusy} onClick={() => void handleExport('csv', 'all')}>
              Export all as CSV
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={exportBusy}
              onClick={() => void handleExport('json', 'page')}
            >
              Export page as JSON
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={exportBusy}
              onClick={() => void handleExport('json', 'all')}
            >
              Export all as JSON
            </DropdownMenuItem>
            {resultType === 'manuscripts' && (
              <DropdownMenuItem
                disabled={exportBusy}
                onClick={() => void handleExport('bibtex', 'all')}
              >
                Export all as BibTeX
              </DropdownMenuItem>
            )}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function SearchPage({ resultType: initialType }: { resultType?: ResultType } = {}) {
  const searchParams = useSearchParams();
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
        queryFn: async () => {
          const payload = await fetchFacetsAndResults(item.value, url);
          return payload?.count ?? 0;
        },
        staleTime: 60_000,
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
          `Exported ${SEARCH_RESULT_CONFIG[resultType].label} as ${format.toUpperCase()}`
        );
      } catch {
        toast.error('Export failed. Try reducing results or choosing another format.');
      } finally {
        setExportBusy(false);
      }
    },
    [queryState, resultType, submittedKeyword]
  );

  return (
    <div className="flex h-screen flex-col bg-muted/30">
      <header className="relative z-10 flex shrink-0 items-center gap-2 border-b bg-background px-3 py-2 shadow-sm sm:gap-3 sm:px-4">
        <h1 className="sr-only">
          {`Search ${SEARCH_RESULT_CONFIG[resultType].label}: ${resultCount.toLocaleString()} results`}
        </h1>
        <div
          className="shrink-0"
          title={`${SEARCH_RESULT_CONFIG[resultType].label} — ${resultCount.toLocaleString()} results`}
        >
          <div className="flex items-baseline gap-1.5 whitespace-nowrap sm:gap-2">
            <span className="text-lg font-bold tabular-nums tracking-tight sm:text-2xl">
              {resultCount.toLocaleString()}
            </span>
            <span className="max-w-[min(28vw,9rem)] truncate text-xs text-muted-foreground sm:max-w-none sm:text-sm">
              results in {SEARCH_RESULT_CONFIG[resultType].label}
            </span>
          </div>
        </div>
        <div className="flex min-h-0 min-w-0 flex-1 items-center">
          <ResultTypeToggle
            selectedType={resultType}
            onChange={handleResultTypeChange}
            enabledTypes={enabledCategories}
            counts={countsByType}
          />
        </div>
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="hidden h-9 w-9 shrink-0 md:inline-flex"
            aria-label={filtersSidebarCollapsed ? 'Show filters panel' : 'Hide filters panel'}
            title={filtersSidebarCollapsed ? 'Show filters (Alt+F)' : 'Hide filters (Alt+F)'}
            onClick={toggleFiltersSidebar}
          >
            {filtersSidebarCollapsed ? (
              <PanelLeftOpen className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </Button>
          <div className="md:hidden">
            <MobileFilterSheet
              activeFilterCount={activeFilterCount}
              onClearAll={() => {
                setMobileQueryDraft((prev) => clearAllFacetFilters(prev));
                setMobileKeywordDraft('');
              }}
              onApply={() => {
                let kw = mobileKeywordDraft.trim();
                if (
                  exactPhraseKeyword &&
                  kw &&
                  !(kw.startsWith('"') && kw.endsWith('"')) &&
                  !(kw.startsWith("'") && kw.endsWith("'"))
                ) {
                  kw = `"${kw.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
                }
                setQueryState(mobileQueryDraft);
                setDraftKeyword(mobileKeywordDraft);
                setSubmittedKeyword(kw);
              }}
            >
              <DynamicFacets
                facets={data.facets}
                searchType={resultType}
                keyword={mobileKeywordDraft}
                activeTags={mobileActiveTags}
                onKeywordChange={setMobileKeywordDraft}
                onKeywordSubmit={setMobileKeywordDraft}
                exactPhrase={exactPhraseKeyword}
                onExactPhraseChange={setExactPhraseKeyword}
                onRemoveTag={(item) => {
                  if (item.facetKey === '__keyword__') {
                    setMobileKeywordDraft('');
                    return;
                  }
                  if (item.facetKey === '__date__') {
                    setMobileQueryDraft((prev) => clearDateFilters(prev));
                    return;
                  }
                  if (item.exclude) {
                    setMobileQueryDraft((prev) =>
                      removeExclusionFromExtraParams(prev, item.facetKey, item.value)
                    );
                    return;
                  }
                  handleMobileFacetClick('', {
                    type: 'deselectFacet',
                    facetKey: item.facetKey,
                    value: item.value,
                  });
                }}
                selectedFacets={mobileQueryDraft.selected_facets}
                onClearAllFilters={() => setMobileQueryDraft((prev) => clearAllFacetFilters(prev))}
                onFacetClick={handleMobileFacetClick}
                baseFacetURL={baseFacetURL}
                visibleFacets={categoryConfig.visibleFacets}
                activeFilterCount={mobileActiveTags.length}
              />
            </MobileFilterSheet>
          </div>
          <SearchActionsMenu
            triggerId="search-actions-trigger"
            keyword={submittedKeyword}
            filterCount={activeFilterCount}
            resultCount={resultCount}
            viewMode={viewMode}
            setViewMode={setViewMode}
            showGridToggle={showGridToggle}
            showTimelineToggle={showTimelineToggle}
            showDistributionToggle={showDistributionToggle}
            showMapToggle={showMapToggle}
            hasTimelineData={hasTimelineData}
            distributionEnabled={distributionEnabled}
            handleShareSearch={handleShareSearch}
            shareFeedback={shareFeedback}
            advancedEnabled={advancedSearch.enabled}
            onToggleAdvanced={() =>
              setAdvancedSearch((prev) => ({ ...prev, enabled: !prev.enabled }))
            }
            orderingOptions={data.ordering?.options}
            setQueryState={setQueryState}
            baseFacetURL={baseFacetURL}
            compareEnabled={compareEnabled}
            compareCount={selectedCompareItems.length}
            onOpenCompare={() => setCompareOpen(true)}
            handleExport={handleExport}
            exportBusy={exportBusy}
            resultType={resultType}
            crossTypeLinks={crossTypeLinks}
          />
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside
          id="search-filters-aside"
          aria-hidden={filtersSidebarCollapsed}
          className={cn(
            'hidden border-r bg-card transition-[width,opacity,border-color] duration-200 ease-out md:flex md:flex-col',
            filtersSidebarCollapsed
              ? 'md:pointer-events-none md:w-0 md:min-w-0 md:overflow-hidden md:border-transparent md:p-0 md:opacity-0'
              : 'md:w-64 md:shrink-0 md:overflow-y-auto md:px-3 md:py-3'
          )}
        >
          <div className="sticky top-0 z-[1] -mx-3 mb-2 flex items-center justify-between gap-2 border-b border-border/60 bg-card px-3 pb-2 pt-0">
            <h2 className="text-sm font-semibold">
              Filters
              {activeFilterCount > 0 && (
                <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                  {activeFilterCount}
                </span>
              )}
            </h2>
            {activeFilterCount > 0 && (
              <button
                type="button"
                className="text-xs text-primary hover:underline"
                onClick={handleClearAllFilters}
              >
                Clear all ({activeFilterCount})
              </button>
            )}
          </div>
          {Object.keys(data.facets).length > 0 ? (
            <DynamicFacets
              facets={data.facets}
              searchType={resultType}
              keyword={draftKeyword}
              activeTags={activeTags}
              onKeywordChange={setDraftKeyword}
              onKeywordSubmit={setSubmittedKeyword}
              exactPhrase={exactPhraseKeyword}
              onExactPhraseChange={setExactPhraseKeyword}
              onRemoveTag={handleRemoveTag}
              selectedFacets={queryState.selected_facets}
              onClearAllFilters={handleClearAllFilters}
              onFacetClick={handleFacetClick}
              baseFacetURL={baseFacetURL}
              visibleFacets={categoryConfig.visibleFacets}
              activeFilterCount={activeFilterCount}
              density="sidebar"
            />
          ) : (
            <div className="text-sm text-muted-foreground">No filters for this type</div>
          )}
        </aside>

        <main className="flex min-w-0 flex-1 flex-col">
          <div
            ref={resultsScrollRef}
            className="relative flex flex-1 flex-col overflow-auto p-2 sm:p-3"
          >
            <div className="flex min-h-0 flex-col rounded-xl border border-border/80 bg-card shadow-sm">
              {isFetching && !isLoading && (
                <div className="h-1 w-full shrink-0 overflow-hidden rounded-t-xl bg-muted">
                  <div className="h-full w-1/3 animate-pulse bg-primary/60" />
                </div>
              )}
              <div className="flex min-w-0 flex-col gap-3 p-3">
                <AdvancedSearchPanel
                  resultType={resultType}
                  value={advancedSearch}
                  onChange={setAdvancedSearch}
                  facetDistribution={data.facetDistribution}
                />
                {filtered.length > 0 ? (
                  viewMode === 'table' ? (
                    <ResultsTable
                      resultType={resultType}
                      results={filtered as ResultListItem[]}
                      ordering={data.ordering}
                      onSort={handleSort}
                      highlightKeyword={submittedKeyword}
                      visibleColumns={categoryConfig.visibleColumns}
                      scrollContainerRef={resultsScrollRef}
                      isFetching={isFetching}
                      compareSelection={compareIds}
                      onToggleCompare={toggleCompare}
                    />
                  ) : viewMode === 'timeline' ? (
                    <SearchTimelineView
                      dateDistribution={timelineDistribution}
                      onApplyRange={(min, max) =>
                        setQueryState((prev) => ({
                          ...prev,
                          dateParams: {
                            ...prev.dateParams,
                            min_date: String(min),
                            max_date: String(max),
                          },
                          offset: 0,
                        }))
                      }
                    />
                  ) : viewMode === 'map' ? (
                    <SearchMapView
                      cityDistribution={cityDistribution}
                      onSelectCity={(city) =>
                        handleFacetClick('', {
                          type: 'selectFacet',
                          facetKey: 'repository_city',
                          value: city,
                        })
                      }
                    />
                  ) : viewMode === 'distribution' ? (
                    <SearchDistributionPanel
                      byDate={graphDistributionQuery.data?.facetDistribution?.date_min}
                      byRepository={graphDistributionQuery.data?.facetDistribution?.repository_name}
                      byHand={graphDistributionQuery.data?.facetDistribution?.hand_name}
                      byComponentFeature={
                        graphDistributionQuery.data?.facetDistribution?.component_features
                      }
                      isLoading={graphDistributionQuery.isFetching}
                      errorMessage={
                        graphDistributionQuery.isError
                          ? 'Could not load distribution stats. Please retry by toggling the Charts view.'
                          : null
                      }
                    />
                  ) : (
                    <SearchGrid
                      results={filtered as Parameters<typeof SearchGrid>[0]['results']}
                      resultType={resultType}
                      highlightKeyword={submittedKeyword}
                      scrollContainerRef={resultsScrollRef}
                      isFetching={isFetching}
                      compareSelection={compareIds}
                      onToggleCompare={toggleCompare}
                    />
                  )
                ) : (
                  <section className="py-10 text-center">
                    <h3 className="text-base font-semibold">No results found</h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {submittedKeyword
                        ? `No ${SEARCH_RESULT_CONFIG[resultType].label.toLowerCase()} matched "${submittedKeyword}".`
                        : `No ${SEARCH_RESULT_CONFIG[resultType].label.toLowerCase()} matched the current filters.`}
                    </p>
                    <div className="mt-4 flex flex-wrap justify-center gap-2">
                      {activeFilterCount > 0 && (
                        <Button variant="outline" size="sm" onClick={handleClearAllFilters}>
                          Clear all filters
                        </Button>
                      )}
                      {submittedKeyword && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setDraftKeyword('');
                            setSubmittedKeyword('');
                          }}
                        >
                          Clear keyword
                        </Button>
                      )}
                    </div>
                  </section>
                )}
              </div>
              {data.count > 0 && (
                <div className="flex shrink-0 justify-center rounded-b-xl border-t border-border/80 bg-card px-3 py-1.5">
                  <Pagination
                    count={data.count}
                    limit={queryState.limit}
                    offset={queryState.offset}
                    onPageChange={handlePage}
                    onLimitChange={handleLimitChange}
                  />
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
      <ComparisonView
        open={compareOpen}
        onOpenChange={setCompareOpen}
        items={selectedCompareItems as Parameters<typeof ComparisonView>[0]['items']}
        resultType={resultType}
      />
    </div>
  );
}
