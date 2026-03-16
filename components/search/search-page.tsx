'use client';

import * as React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Grid, List, Share2 } from 'lucide-react';
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

type ResultListItem = ResultMap[ResultType];

const TABLE_ONLY_TYPES: readonly ResultType[] = ['texts', 'people', 'places'];
const TABLE_ONLY_TYPE_SET = new Set<ResultType>(TABLE_ONLY_TYPES);

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

function ResultTypeToggle({
  selectedType,
  onChange,
  enabledTypes,
}: {
  selectedType: ResultType;
  onChange: (next: ResultType) => void;
  enabledTypes?: ResultType[];
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
        </Button>
      ))}
    </div>
  );
}

export function SearchPage({ resultType: initialType }: { resultType?: ResultType } = {}) {
  const searchParams = useSearchParams();
  const [viewMode, setViewMode] = React.useState<'table' | 'grid'>('table');
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
  const { setSuggestionsPool } = useSearchContext();
  const { enabledCategories, getCategoryConfig } = useSiteFeatures();
  const categoryConfig = getCategoryConfig(resultType);

  React.useEffect(() => {
    if (initialType != null) setResultType(initialType);
  }, [initialType]);

  React.useEffect(() => {
    const kw = searchParams.get('keyword');
    const value = kw ?? '';
    setDraftKeyword(value);
    setSubmittedKeyword(value);
    setQueryState(stateFromSearchParams(searchParams));
  }, [searchParams]);

  React.useEffect(() => {
    const qs = buildQueryString(queryState);
    const params = new URLSearchParams(qs);
    if (submittedKeyword) params.set('keyword', submittedKeyword);
    const path = '/search/' + resultType + (params.toString() ? '?' + params.toString() : '');
    window.history.replaceState(null, '', path);
  }, [resultType, queryState, submittedKeyword]);

  const handleResultTypeChange = React.useCallback((next: ResultType) => {
    setResultType(next);
    setQueryState((prev) => ({ ...prev, selected_facets: [], dateParams: {}, offset: 0 }));
  }, []);

  const { baseFacetURL, data } = useSearchResults(resultType, queryState, submittedKeyword);
  const filtered = data.results;

  React.useEffect(() => {
    setSuggestionsPool(getSuggestionsPool(data.results));
    return () => setSuggestionsPool([]);
  }, [data.results, setSuggestionsPool]);

  React.useEffect(() => {
    if (isTableOnlyType(resultType) && viewMode !== 'table') setViewMode('table');
  }, [resultType, viewMode]);

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
        setQueryState((prev) => ({ ...prev, ordering: `${nextAsc ? '' : '-'}${ck}`, offset: 0 }));
      }
    },
    [data.ordering, sortKey, ascending, baseFacetURL]
  );

  const showGridToggle = !isTableOnlyType(resultType);
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
          />
        </div>
        <div className="flex gap-2 shrink-0">
          <SavedSearchesDropdown
            resultType={resultType}
            keyword={submittedKeyword}
            filterCount={activeFilterCount}
            resultCount={resultCount}
          />
          <Button variant="ghost" size="sm" onClick={() => void handleShareSearch()}>
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
          >
            <List className="h-4 w-4" />
          </Button>
          {showGridToggle && (
            <Button
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
            >
              <Grid className="h-4 w-4" />
            </Button>
          )}
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        <aside className="w-64 shrink-0 border-r bg-white py-4 px-4 overflow-y-auto">
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
          <div className="p-4 overflow-auto flex-1 flex flex-col gap-4">
            {filtered.length > 0 ? (
              viewMode === 'table' ? (
                <ResultsTable
                  resultType={resultType}
                  results={filtered as ResultListItem[]}
                  ordering={data.ordering}
                  onSort={handleSort}
                  highlightKeyword={submittedKeyword}
                  visibleColumns={categoryConfig.visibleColumns}
                />
              ) : (
                <SearchGrid
                  results={filtered as Parameters<typeof SearchGrid>[0]['results']}
                  resultType={resultType}
                  highlightKeyword={submittedKeyword}
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
    </div>
  );
}
