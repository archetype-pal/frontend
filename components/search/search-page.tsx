'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { ResultsTable } from '@/components/search/results-table';
import { SearchGrid } from '@/components/search/search-grid';
import { DynamicFacets } from '@/components/filters/dynamic-facets';
import { ResultTypeToggle } from '@/components/search/result-type-toggle';
import { SearchActionsMenu } from '@/components/search/search-actions-menu';
import { type ResultType } from '@/lib/search-types';
import { resolveResultTypeLabel } from '@/lib/search-label-helpers';
import { useModelLabels } from '@/contexts/model-labels-context';
import { Pagination } from '@/components/search/paginated-search';
import type { ResultMap } from '@/types/search';
import {
  clearAllFacetFilters,
  clearDateFilters,
  removeExclusionFromExtraParams,
} from '@/lib/search-query';
const SearchTimelineView = React.lazy(() =>
  import('@/components/search/search-timeline-view').then((m) => ({
    default: m.SearchTimelineView,
  }))
);
const SearchDistributionPanel = React.lazy(() =>
  import('@/components/search/search-distribution-panel').then((m) => ({
    default: m.SearchDistributionPanel,
  }))
);
import { AdvancedSearchPanel } from '@/components/search/advanced-search-panel';
import { MobileFilterSheet } from '@/components/search/mobile-filter-sheet';
import { FieldVisibilityMenu } from '@/components/search/field-visibility-menu';
const SearchMapView = React.lazy(() =>
  import('@/components/search/search-map-view').then((m) => ({ default: m.SearchMapView }))
);
const ComparisonView = React.lazy(() =>
  import('@/components/search/comparison-view').then((m) => ({ default: m.ComparisonView }))
);
import { cn } from '@/lib/utils';
import { useSearchPageState } from '@/hooks/search/use-search-page-state';

type ResultListItem = ResultMap[ResultType];

export function SearchPage({ resultType: initialType }: { resultType?: ResultType } = {}) {
  const { resultsScrollRef, ...s } = useSearchPageState(initialType);
  const { getLabel } = useModelLabels();
  const typeLabel = resolveResultTypeLabel(s.resultType, getLabel);

  return (
    <div className="flex h-screen flex-col bg-muted/30">
      <header className="relative z-10 flex shrink-0 items-center gap-2 border-b bg-background px-3 py-2 shadow-sm sm:gap-3 sm:px-4">
        <h1 className="sr-only">
          {`Search ${typeLabel}: ${s.resultCount.toLocaleString()} results`}
        </h1>
        <div
          className="shrink-0"
          title={`${typeLabel} — ${s.resultCount.toLocaleString()} results`}
        >
          <div className="flex items-baseline gap-1.5 whitespace-nowrap sm:gap-2">
            <span className="text-lg font-bold tabular-nums tracking-tight sm:text-2xl">
              {s.resultCount.toLocaleString()}
            </span>
            <span className="max-w-[min(28vw,9rem)] truncate text-xs text-muted-foreground sm:max-w-none sm:text-sm">
              results in {typeLabel}
            </span>
          </div>
        </div>
        <div className="flex min-h-0 min-w-0 flex-1 items-center">
          <ResultTypeToggle
            selectedType={s.resultType}
            onChange={s.handleResultTypeChange}
            enabledTypes={s.enabledCategories}
            counts={s.countsByType}
          />
        </div>
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="hidden h-9 w-9 shrink-0 md:inline-flex"
            aria-label={s.filtersSidebarCollapsed ? 'Show filters panel' : 'Hide filters panel'}
            title={s.filtersSidebarCollapsed ? 'Show filters (Alt+F)' : 'Hide filters (Alt+F)'}
            onClick={s.toggleFiltersSidebar}
          >
            {s.filtersSidebarCollapsed ? (
              <PanelLeftOpen className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </Button>
          <div className="md:hidden">
            <MobileFilterSheet
              activeFilterCount={s.activeFilterCount}
              onClearAll={() => {
                s.setMobileQueryDraft((prev) => clearAllFacetFilters(prev));
                s.setMobileKeywordDraft('');
              }}
              onApply={() => {
                let kw = s.mobileKeywordDraft.trim();
                if (
                  s.exactPhraseKeyword &&
                  kw &&
                  !(kw.startsWith('"') && kw.endsWith('"')) &&
                  !(kw.startsWith("'") && kw.endsWith("'"))
                ) {
                  kw = `"${kw.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
                }
                s.setQueryState(s.mobileQueryDraft);
                s.setDraftKeyword(s.mobileKeywordDraft);
                s.setSubmittedKeyword(kw);
              }}
            >
              <DynamicFacets
                facets={s.data.facets}
                searchType={s.resultType}
                keyword={s.mobileKeywordDraft}
                activeTags={s.mobileActiveTags}
                onKeywordChange={s.setMobileKeywordDraft}
                onKeywordSubmit={s.setMobileKeywordDraft}
                exactPhrase={s.exactPhraseKeyword}
                onExactPhraseChange={s.setExactPhraseKeyword}
                onRemoveTag={(item) => {
                  if (item.facetKey === '__keyword__') {
                    s.setMobileKeywordDraft('');
                    return;
                  }
                  if (item.facetKey === '__date__') {
                    s.setMobileQueryDraft((prev) => clearDateFilters(prev));
                    return;
                  }
                  if (item.exclude) {
                    s.setMobileQueryDraft((prev) =>
                      removeExclusionFromExtraParams(prev, item.facetKey, item.value)
                    );
                    return;
                  }
                  s.handleMobileFacetClick('', {
                    type: 'deselectFacet',
                    facetKey: item.facetKey,
                    value: item.value,
                  });
                }}
                selectedFacets={s.mobileQueryDraft.selected_facets}
                onClearAllFilters={() =>
                  s.setMobileQueryDraft((prev) => clearAllFacetFilters(prev))
                }
                onFacetClick={s.handleMobileFacetClick}
                baseFacetURL={s.baseFacetURL}
                visibleFacets={s.categoryConfig.visibleFacets}
                activeFilterCount={s.mobileActiveTags.length}
              />
            </MobileFilterSheet>
          </div>
          {s.visibility.isResearcher && (
            <FieldVisibilityMenu
              resultType={s.resultType}
              visibleColumns={s.visibility.visibleColumns}
              visibleFacets={s.visibility.visibleFacets}
              onColumnsChange={s.visibility.setVisibleColumns}
              onFacetsChange={s.visibility.setVisibleFacets}
              onReset={s.visibility.resetToDefault}
            />
          )}
          <SearchActionsMenu
            triggerId="search-actions-trigger"
            keyword={s.submittedKeyword}
            filterCount={s.activeFilterCount}
            resultCount={s.resultCount}
            viewMode={s.viewMode}
            setViewMode={s.setViewMode}
            showGridToggle={s.showGridToggle}
            showTimelineToggle={s.showTimelineToggle}
            showDistributionToggle={s.showDistributionToggle}
            showMapToggle={s.showMapToggle}
            hasTimelineData={s.hasTimelineData}
            distributionEnabled={s.distributionEnabled}
            handleShareSearch={s.handleShareSearch}
            shareFeedback={s.shareFeedback}
            advancedEnabled={s.advancedSearch.enabled}
            onToggleAdvanced={() =>
              s.setAdvancedSearch((prev) => ({ ...prev, enabled: !prev.enabled }))
            }
            orderingOptions={s.data.ordering?.options}
            setQueryState={s.setQueryState}
            baseFacetURL={s.baseFacetURL}
            compareEnabled={s.compareEnabled}
            compareCount={s.selectedCompareItems.length}
            onOpenCompare={() => s.setCompareOpen(true)}
            handleExport={s.handleExport}
            handleFormattedExport={s.handleFormattedExport}
            exportBusy={s.exportBusy}
            resultType={s.resultType}
            crossTypeLinks={s.crossTypeLinks}
            isResearcher={s.visibility.isResearcher}
          />
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside
          id="search-filters-aside"
          aria-hidden={s.filtersSidebarCollapsed}
          className={cn(
            'hidden border-r bg-card transition-[width,opacity,border-color] duration-200 ease-out md:flex md:flex-col',
            s.filtersSidebarCollapsed
              ? 'md:pointer-events-none md:w-0 md:min-w-0 md:overflow-hidden md:border-transparent md:p-0 md:opacity-0'
              : 'md:w-64 md:shrink-0 md:overflow-y-auto md:px-3 md:py-3'
          )}
        >
          <div className="sticky top-0 z-[1] -mx-3 mb-2 flex items-center justify-between gap-2 border-b border-border/60 bg-card px-3 pb-2 pt-0">
            <h2 className="text-sm font-semibold">
              Filters
              {s.activeFilterCount > 0 && (
                <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                  {s.activeFilterCount}
                </span>
              )}
            </h2>
            {s.activeFilterCount > 0 && (
              <button
                type="button"
                className="text-xs text-primary hover:underline"
                onClick={s.handleClearAllFilters}
              >
                Clear all ({s.activeFilterCount})
              </button>
            )}
          </div>
          {Object.keys(s.data.facets).length > 0 ? (
            <DynamicFacets
              facets={s.data.facets}
              searchType={s.resultType}
              keyword={s.draftKeyword}
              activeTags={s.activeTags}
              onKeywordChange={s.setDraftKeyword}
              onKeywordSubmit={s.setSubmittedKeyword}
              exactPhrase={s.exactPhraseKeyword}
              onExactPhraseChange={s.setExactPhraseKeyword}
              onRemoveTag={s.handleRemoveTag}
              selectedFacets={s.queryState.selected_facets}
              onClearAllFilters={s.handleClearAllFilters}
              onFacetClick={s.handleFacetClick}
              baseFacetURL={s.baseFacetURL}
              visibleFacets={s.categoryConfig.visibleFacets}
              activeFilterCount={s.activeFilterCount}
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
              {s.isFetching && !s.isLoading && (
                <div className="h-1 w-full shrink-0 overflow-hidden rounded-t-xl bg-muted">
                  <div className="h-full w-1/3 animate-pulse bg-primary/60" />
                </div>
              )}
              <div className="flex min-w-0 flex-col gap-3 p-3">
                <AdvancedSearchPanel
                  resultType={s.resultType}
                  value={s.advancedSearch}
                  onChange={s.setAdvancedSearch}
                  facetDistribution={s.data.facetDistribution}
                />
                {s.filtered.length > 0 ? (
                  s.viewMode === 'table' ? (
                    <ResultsTable
                      resultType={s.resultType}
                      results={s.filtered as ResultListItem[]}
                      ordering={s.data.ordering}
                      onSort={s.handleSort}
                      highlightKeyword={s.submittedKeyword}
                      visibleColumns={s.categoryConfig.visibleColumns}
                      scrollContainerRef={resultsScrollRef}
                      isFetching={s.isFetching}
                      compareSelection={s.compareIds}
                      onToggleCompare={s.toggleCompare}
                    />
                  ) : s.viewMode === 'timeline' ? (
                    <React.Suspense
                      fallback={
                        <div className="flex items-center justify-center py-20 text-sm text-muted-foreground">
                          Loading timeline…
                        </div>
                      }
                    >
                      <SearchTimelineView
                        dateDistribution={s.timelineDistribution}
                        onApplyRange={(min, max) =>
                          s.setQueryState((prev) => ({
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
                    </React.Suspense>
                  ) : s.viewMode === 'map' ? (
                    <React.Suspense
                      fallback={
                        <div className="flex items-center justify-center py-20 text-sm text-muted-foreground">
                          Loading map…
                        </div>
                      }
                    >
                      <SearchMapView
                        cityDistribution={s.cityDistribution}
                        onSelectCity={(city) =>
                          s.handleFacetClick('', {
                            type: 'selectFacet',
                            facetKey: 'repository_city',
                            value: city,
                          })
                        }
                      />
                    </React.Suspense>
                  ) : s.viewMode === 'distribution' ? (
                    <React.Suspense
                      fallback={
                        <div className="flex items-center justify-center py-20 text-sm text-muted-foreground">
                          Loading charts…
                        </div>
                      }
                    >
                      <SearchDistributionPanel
                        byDate={s.graphDistributionQuery.data?.facetDistribution?.date_min}
                        byRepository={
                          s.graphDistributionQuery.data?.facetDistribution?.repository_name
                        }
                        byHand={s.graphDistributionQuery.data?.facetDistribution?.hand_name}
                        byComponentFeature={
                          s.graphDistributionQuery.data?.facetDistribution?.component_features
                        }
                        isLoading={s.graphDistributionQuery.isFetching}
                        errorMessage={
                          s.graphDistributionQuery.isError
                            ? 'Could not load distribution stats. Please retry by toggling the Charts view.'
                            : null
                        }
                      />
                    </React.Suspense>
                  ) : (
                    <SearchGrid
                      results={s.filtered as Parameters<typeof SearchGrid>[0]['results']}
                      resultType={s.resultType}
                      highlightKeyword={s.submittedKeyword}
                      scrollContainerRef={resultsScrollRef}
                      isFetching={s.isFetching}
                      compareSelection={s.compareIds}
                      onToggleCompare={s.toggleCompare}
                    />
                  )
                ) : (
                  <section className="py-10 text-center">
                    <h3 className="text-base font-semibold">No results found</h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {s.submittedKeyword
                        ? `No ${typeLabel.toLowerCase()} matched "${s.submittedKeyword}".`
                        : `No ${typeLabel.toLowerCase()} matched the current filters.`}
                    </p>
                    <div className="mt-4 flex flex-wrap justify-center gap-2">
                      {s.activeFilterCount > 0 && (
                        <Button variant="outline" size="sm" onClick={s.handleClearAllFilters}>
                          Clear all filters
                        </Button>
                      )}
                      {s.submittedKeyword && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            s.setDraftKeyword('');
                            s.setSubmittedKeyword('');
                          }}
                        >
                          Clear keyword
                        </Button>
                      )}
                    </div>
                  </section>
                )}
              </div>
              {s.data.count > 0 && (
                <div className="flex shrink-0 justify-center rounded-b-xl border-t border-border/80 bg-card px-3 py-1.5">
                  <Pagination
                    count={s.data.count}
                    limit={s.queryState.limit}
                    offset={s.queryState.offset}
                    onPageChange={s.handlePage}
                    onLimitChange={s.handleLimitChange}
                  />
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
      {s.compareOpen && (
        <React.Suspense fallback={null}>
          <ComparisonView
            open={s.compareOpen}
            onOpenChange={s.setCompareOpen}
            items={s.selectedCompareItems as Parameters<typeof ComparisonView>[0]['items']}
            resultType={s.resultType}
          />
        </React.Suspense>
      )}
    </div>
  );
}
