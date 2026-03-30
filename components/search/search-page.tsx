'use client';

import * as React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { BarChart3, Clock3, Download, Globe2, Grid, List, Share2, Sparkles } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ResultsTable } from '@/components/search/results-table';
import { SearchGrid } from '@/components/search/search-grid';
import { DynamicFacets } from '@/components/filters/dynamic-facets';
import { SavedSearchesDropdown } from '@/components/search/saved-searches';
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
  buildActiveQueryTags,
  buildQueryString,
  clearAllFacetFilters,
  clearDateFilters,
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

type ResultListItem = ResultMap[ResultType];
type ViewMode = 'table' | 'grid' | 'timeline' | 'distribution' | 'map';

const TABLE_ONLY_TYPES: readonly ResultType[] = ['texts', 'people', 'places'];
const TABLE_ONLY_TYPE_SET = new Set<ResultType>(TABLE_ONLY_TYPES);
const VIEW_PREFS_KEY = 'search-view-prefs';
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

function areStringRecordValuesEqual(a: Record<string, string>, b: Record<string, string>): boolean {
  const aEntries = Object.entries(a);
  const bEntries = Object.entries(b);
  if (aEntries.length !== bEntries.length) return false;
  return aEntries.every(([key, value]) => b[key] === value);
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
    <div className="flex w-full gap-1.5 my-0" role="tablist" aria-label="Search result type">
      {items.map((item) => (
        <Button
          key={item.value}
          type="button"
          className="flex-1 min-w-0"
          variant={selectedType === item.value ? 'toggle' : 'outline'}
          size="sm"
          onClick={() => onChange(item.value)}
          role="tab"
          aria-selected={selectedType === item.value}
        >
          {item.label}
          {typeof counts?.[item.value] === 'number' && (
            <span className="ml-1 text-[11px] opacity-80">({counts[item.value]})</span>
          )}
        </Button>
      ))}
    </div>
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
  const [compareIds, setCompareIds] = React.useState<string[]>([]);
  const [compareOpen, setCompareOpen] = React.useState(false);
  const { setSuggestionsPool } = useSearchContext();
  const { enabledCategories, getCategoryConfig } = useSiteFeatures();
  const categoryConfig = getCategoryConfig(resultType);

  React.useEffect(() => {
    if (initialType != null) setResultType(initialType);
  }, [initialType]);

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
    setAdvancedSearch((prev) => ({
      ...prev,
      enabled:
        searchParams.get('advanced') === 'true' ||
        searchParams.get('matching_strategy') != null ||
        searchParams.get('search_field') != null ||
        notFacetEntry != null ||
        rangeMinEntry != null ||
        rangeMaxEntry != null,
      matchingStrategy:
        (searchParams.get('matching_strategy') as AdvancedSearchState['matchingStrategy']) ??
        prev.matchingStrategy,
      searchField: searchParams.get('search_field') ?? '',
      notFacetKey: notFacetEntry ? notFacetEntry[0].replace(/__not$/, '') : '',
      notFacetValue: notFacetEntry?.[1] ?? '',
      rangeField:
        (rangeMinEntry?.[0] ?? rangeMaxEntry?.[0] ?? '').replace(/__(min|max)$/, '') ?? '',
      rangeMin: rangeMinEntry?.[1] ?? '',
      rangeMax: rangeMaxEntry?.[1] ?? '',
    }));
  }, [searchParams]);

  React.useEffect(() => {
    const qs = buildQueryString(queryState);
    const params = new URLSearchParams(qs);
    if (submittedKeyword) params.set('keyword', submittedKeyword);
    if (advancedSearch.enabled) params.set('advanced', 'true');
    if (compareIds.length > 0) {
      params.set('compare', compareIds.join(','));
    }
    const path = '/search/' + resultType + (params.toString() ? '?' + params.toString() : '');
    const currentPath = window.location.pathname + window.location.search;
    if (path !== currentPath) {
      isInternalUrlUpdate.current = true;
      window.history.replaceState(null, '', path);
    }
  }, [advancedSearch.enabled, compareIds, queryState, resultType, submittedKeyword]);

  const handleResultTypeChange = React.useCallback((next: ResultType) => {
    setResultType(next);
    setQueryState((prev) => ({ ...prev, selected_facets: [], dateParams: {}, offset: 0 }));
    setCompareIds([]);
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
    });
  }, [submittedKeyword, queryState.dateParams, queryState.selected_facets, resultType]);
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
    });
  }, [
    mobileKeywordDraft,
    mobileQueryDraft.dateParams,
    mobileQueryDraft.selected_facets,
    resultType,
  ]);

  React.useEffect(() => {
    setQueryState((prev) => {
      const nextExtra = { ...(prev.extraParams ?? {}) };
      delete nextExtra.matching_strategy;
      delete nextExtra.search_field;
      if (advancedSearch.notFacetKey) {
        delete nextExtra[`${advancedSearch.notFacetKey}__not`];
      }
      if (advancedSearch.rangeField) {
        delete nextExtra[`${advancedSearch.rangeField}__min`];
        delete nextExtra[`${advancedSearch.rangeField}__max`];
      }
      if (advancedSearch.enabled) {
        nextExtra.matching_strategy = advancedSearch.matchingStrategy;
        if (advancedSearch.searchField) nextExtra.search_field = advancedSearch.searchField;
        if (advancedSearch.notFacetKey && advancedSearch.notFacetValue) {
          nextExtra[`${advancedSearch.notFacetKey}__not`] = advancedSearch.notFacetValue;
        }
        if (advancedSearch.rangeField && advancedSearch.rangeMin) {
          nextExtra[`${advancedSearch.rangeField}__min`] = advancedSearch.rangeMin;
        }
        if (advancedSearch.rangeField && advancedSearch.rangeMax) {
          nextExtra[`${advancedSearch.rangeField}__max`] = advancedSearch.rangeMax;
        }
      }
      const prevExtra = prev.extraParams ?? {};
      if (areStringRecordValuesEqual(prevExtra, nextExtra)) {
        return prev;
      }
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
          const savedButton = document.getElementById(
            'saved-searches-trigger'
          ) as HTMLButtonElement | null;
          savedButton?.click();
        },
      },
      {
        key: 'f',
        altKey: true,
        handler: (event: KeyboardEvent) => {
          event.preventDefault();
          const aside = document.getElementById('search-filters-aside');
          const mobileBtn = document.getElementById('search-filters-mobile-trigger');
          if (window.matchMedia('(min-width: 768px)').matches) {
            aside?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          } else {
            mobileBtn?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            mobileBtn?.focus();
          }
        },
      },
    ],
    [handleResultTypeChange, hasTimelineData, resultType]
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
    <div className="h-screen flex flex-col bg-gray-50">
      <header className="shrink-0 px-6 py-3 border-b bg-white flex items-center justify-between gap-4 flex-wrap">
        <div className="shrink-0">
          <h1 className="text-lg font-semibold">
            Search: {SEARCH_RESULT_CONFIG[resultType].label} ({resultCount})
          </h1>
          {crossTypeLinks.length > 0 && (
            <div className="flex items-center gap-1 mt-0.5">
              <span className="text-[11px] text-muted-foreground">Also in:</span>
              {crossTypeLinks.map((type, i) => (
                <React.Fragment key={type}>
                  {i > 0 && <span className="text-[11px] text-muted-foreground/40">·</span>}
                  <Link
                    href={`/search/${type}${submittedKeyword ? '?keyword=' + encodeURIComponent(submittedKeyword) : ''}`}
                    className="text-[11px] text-primary hover:underline"
                  >
                    {SEARCH_RESULT_CONFIG[type].label}
                  </Link>
                </React.Fragment>
              ))}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0 flex items-center px-2">
          <ResultTypeToggle
            selectedType={resultType}
            onChange={handleResultTypeChange}
            enabledTypes={enabledCategories}
            counts={countsByType}
          />
        </div>
        <div className="flex gap-2 shrink-0 items-center">
          <SavedSearchesDropdown
            triggerId="saved-searches-trigger"
            resultType={resultType}
            keyword={submittedKeyword}
            filterCount={activeFilterCount}
            resultCount={resultCount}
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void handleShareSearch()}
            title="Copy current search URL"
            aria-label="Share current search URL"
          >
            <Share2 className="h-4 w-4" />
            <span className="ml-1 hidden sm:inline">
              {shareFeedback === 'copied'
                ? 'Copied'
                : shareFeedback === 'error'
                  ? 'Failed'
                  : 'Share'}
            </span>
          </Button>
          <Button
            variant={viewMode === 'table' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('table')}
            title="View results as a sortable table"
            aria-label="Switch to table view"
          >
            <List className="h-4 w-4" />
            <span className="ml-1 hidden lg:inline">Table</span>
          </Button>
          {showGridToggle && (
            <Button
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              title="View results as image cards"
              aria-label="Switch to grid view"
            >
              <Grid className="h-4 w-4" />
              <span className="ml-1 hidden lg:inline">Grid</span>
            </Button>
          )}
          {showTimelineToggle && (
            <Button
              variant={viewMode === 'timeline' ? 'secondary' : 'ghost'}
              size="sm"
              disabled={!hasTimelineData}
              onClick={() => setViewMode('timeline')}
              title={
                hasTimelineData
                  ? 'See result distribution across decades; click a bar to filter'
                  : 'No date data available'
              }
              aria-label="Switch to timeline view"
            >
              <Clock3 className="h-4 w-4" />
              <span className="ml-1 hidden lg:inline">Timeline</span>
            </Button>
          )}
          {showDistributionToggle && (
            <Button
              variant={viewMode === 'distribution' ? 'secondary' : 'ghost'}
              size="sm"
              disabled={!distributionEnabled}
              onClick={() => setViewMode('distribution')}
              title={
                distributionEnabled
                  ? 'Charts for distribution by date, repository, and hand'
                  : 'Distribution charts are available for graphs'
              }
              aria-label="Switch to distribution charts view"
            >
              <BarChart3 className="h-4 w-4" />
              <span className="ml-1 hidden lg:inline">Charts</span>
            </Button>
          )}
          {showMapToggle && (
            <Button
              variant={viewMode === 'map' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('map')}
              title="Map repositories by city and filter from markers"
              aria-label="Switch to map view"
            >
              <Globe2 className="h-4 w-4" />
              <span className="ml-1 hidden lg:inline">Map</span>
            </Button>
          )}
          <Button
            variant={advancedSearch.enabled ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setAdvancedSearch((prev) => ({ ...prev, enabled: !prev.enabled }))}
            title="Toggle advanced search controls"
            aria-label="Toggle advanced search controls"
          >
            <Sparkles className="h-4 w-4" />
            <span className="ml-1 hidden lg:inline">Advanced</span>
          </Button>
          {data.ordering?.options && data.ordering.options.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  title="Sort options"
                  aria-label="Open sort options"
                >
                  <span className="text-xs">Sort</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {data.ordering.options.map((option) => (
                  <DropdownMenuItem
                    key={option.name}
                    onClick={() => setQueryState(stateFromUrl(option.url, baseFacetURL))}
                  >
                    {option.text}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          {compareEnabled && (
            <Button
              variant="ghost"
              size="sm"
              disabled={selectedCompareItems.length < 2}
              onClick={() => setCompareOpen(true)}
              title="Compare selected items"
            >
              Compare ({selectedCompareItems.length})
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                disabled={exportBusy}
                title="Export search results"
                aria-label="Open export menu"
              >
                <Download className="h-4 w-4" />
                <span className="ml-1 hidden lg:inline">Export</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => void handleExport('csv', 'page')}>
                Export page as CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => void handleExport('csv', 'all')}>
                Export all as CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => void handleExport('json', 'page')}>
                Export page as JSON
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => void handleExport('json', 'all')}>
                Export all as JSON
              </DropdownMenuItem>
              {resultType === 'manuscripts' && (
                <DropdownMenuItem onClick={() => void handleExport('bibtex', 'all')}>
                  Export all as BibTeX
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        <div className="absolute right-4 top-[76px] z-20">
          <MobileFilterSheet
            activeFilterCount={activeFilterCount}
            onClearAll={() => {
              setMobileQueryDraft((prev) => clearAllFacetFilters(prev));
              setMobileKeywordDraft('');
            }}
            onApply={() => {
              setQueryState(mobileQueryDraft);
              setDraftKeyword(mobileKeywordDraft);
              setSubmittedKeyword(mobileKeywordDraft);
            }}
          >
            <DynamicFacets
              facets={data.facets}
              searchType={resultType}
              keyword={mobileKeywordDraft}
              activeTags={mobileActiveTags}
              onKeywordChange={setMobileKeywordDraft}
              onKeywordSubmit={setMobileKeywordDraft}
              onRemoveTag={(item) => {
                if (item.facetKey === '__keyword__') {
                  setMobileKeywordDraft('');
                  return;
                }
                if (item.facetKey === '__date__') {
                  setMobileQueryDraft((prev) => clearDateFilters(prev));
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
        <aside
          id="search-filters-aside"
          className="hidden md:block w-64 shrink-0 border-r bg-white py-4 px-4 overflow-y-auto"
        >
          <div className="mb-3 flex items-center justify-between gap-2">
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
              onRemoveTag={handleRemoveTag}
              selectedFacets={queryState.selected_facets}
              onClearAllFilters={handleClearAllFilters}
              onFacetClick={handleFacetClick}
              baseFacetURL={baseFacetURL}
              visibleFacets={categoryConfig.visibleFacets}
              activeFilterCount={activeFilterCount}
            />
          ) : (
            <div className="text-sm text-muted-foreground">No filters for this type</div>
          )}
        </aside>

        <main className="flex-1 flex flex-col min-w-0">
          <div
            ref={resultsScrollRef}
            className="p-4 overflow-auto flex-1 flex flex-col gap-4 relative"
          >
            {isFetching && !isLoading && (
              <div className="h-1 w-full overflow-hidden rounded bg-muted">
                <div className="h-full w-1/3 animate-pulse bg-primary/60" />
              </div>
            )}
            <AdvancedSearchPanel
              resultType={resultType}
              value={advancedSearch}
              onChange={setAdvancedSearch}
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
              <section className="rounded-lg border bg-white p-6 text-center">
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

            {data.count > 0 && (
              <div className="shrink-0 flex justify-center border rounded-md bg-white py-2 px-4">
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
