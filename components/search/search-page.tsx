'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { PanelLeftClose, PanelLeftOpen, SearchX } from 'lucide-react';
import { ResultsTable } from '@/components/search/results-table';
import { ResultsMediaList } from '@/components/search/results-media-list';
import { SearchGrid } from '@/components/search/search-grid';
import { DynamicFacets } from '@/components/filters/dynamic-facets';
import { ActiveFacetTags } from '@/components/filters/active-facet-tags';
import { ResultTypeToggle } from '@/components/search/result-type-toggle';
import { SearchActionsMenu } from '@/components/search/search-actions-menu';
import { ViewSwitcher } from '@/components/search/view-switcher';
import { SortMenu } from '@/components/search/sort-menu';
import { DensityToggle } from '@/components/search/density-toggle';
import { SearchKeywordBar } from '@/components/search/search-keyword-bar';
import { SearchLanding } from '@/components/search/search-landing';
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
import { cn } from '@/lib/utils';
import { useSearchPageState } from '@/hooks/search/use-search-page-state';

type ResultListItem = ResultMap[ResultType];

export function SearchPage({ resultType: initialType }: { resultType?: ResultType } = {}) {
  const { resultsScrollRef, ...s } = useSearchPageState(initialType);
  const { getLabel } = useModelLabels();
  const typeLabel = resolveResultTypeLabel(s.resultType, getLabel);

  return (
    <div className="flex h-screen flex-col bg-background">
      <header className="relative z-10 flex shrink-0 flex-col gap-2.5 border-b border-border bg-card px-3 py-2.5 shadow-[0_1px_0_rgba(0,0,0,0.02)] after:pointer-events-none after:absolute after:inset-x-0 after:-bottom-px after:h-px after:bg-gradient-to-r after:from-transparent after:via-accent/50 after:to-transparent sm:px-5">
        <h1 className="sr-only">
          {`Search ${typeLabel}: ${s.resultCount.toLocaleString()} results`}
        </h1>
        {/* Row 1: result count · the single keyword search · view / sort / actions */}
        <div className="flex items-center gap-3 sm:gap-4">
          <div
            className="shrink-0"
            title={`${typeLabel} — ${s.resultCount.toLocaleString()} results`}
          >
            <div className="flex items-baseline gap-2 whitespace-nowrap">
              <span className="font-display text-[1.65rem] font-semibold leading-none tracking-tight tabular-nums text-primary sm:text-[2.4rem]">
                {s.resultCount.toLocaleString()}
              </span>
              <span className="font-serif text-xs tracking-tight text-muted-foreground sm:text-sm">
                results
              </span>
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <SearchKeywordBar
              searchType={s.resultType}
              value={s.draftKeyword}
              onChange={s.setDraftKeyword}
              onSubmit={s.setSubmittedKeyword}
              exactPhrase={s.exactPhraseKeyword}
              onExactPhraseChange={s.setExactPhraseKeyword}
              className="hidden md:block md:max-w-2xl"
              inputClassName="h-9 bg-background"
            />
          </div>
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <ViewSwitcher
              viewMode={s.viewMode}
              setViewMode={s.setViewMode}
              showGridToggle={s.showGridToggle}
              showTimelineToggle={s.showTimelineToggle}
              showDistributionToggle={s.showDistributionToggle}
              showMapToggle={s.showMapToggle}
              hasTimelineData={s.hasTimelineData}
              distributionEnabled={s.distributionEnabled}
              className="hidden sm:inline-flex"
            />
            {s.viewMode === 'table' && (
              <DensityToggle
                density={s.density}
                setDensity={s.setDensity}
                className="hidden sm:inline-flex"
              />
            )}
            {(s.viewMode === 'table' || s.viewMode === 'grid') && (
              <SortMenu
                ordering={s.data.ordering}
                baseFacetURL={s.baseFacetURL}
                setQueryState={s.setQueryState}
              />
            )}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="hidden h-9 w-9 shrink-0 text-muted-foreground hover:bg-muted hover:text-foreground md:inline-flex"
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
                  keywordInputId="search-keyword-input-mobile"
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
              advancedEnabled={s.advancedSearch.enabled}
              onToggleAdvanced={() =>
                s.setAdvancedSearch((prev) => ({ ...prev, enabled: !prev.enabled }))
              }
              handleExport={s.handleExport}
              handleFormattedExport={s.handleFormattedExport}
              exportBusy={s.exportBusy}
              resultType={s.resultType}
              isResearcher={s.visibility.isResearcher}
            />
          </div>
        </div>
        {/* Row 2: the result-type tabs */}
        <div className="min-w-0">
          <ResultTypeToggle
            selectedType={s.resultType}
            onChange={s.handleResultTypeChange}
            enabledTypes={s.enabledCategories}
            counts={s.countsByType}
          />
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside
          id="search-filters-aside"
          aria-hidden={s.filtersSidebarCollapsed}
          className={cn(
            'hidden border-r border-border bg-background transition-[width,opacity,border-color] duration-200 ease-out md:flex md:flex-col',
            s.filtersSidebarCollapsed
              ? 'md:pointer-events-none md:w-0 md:min-w-0 md:overflow-hidden md:border-transparent md:p-0 md:opacity-0'
              : 'md:w-64 md:shrink-0 md:overflow-y-auto md:px-3 md:py-3'
          )}
        >
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
              hideActiveTags
              hideKeyword
            />
          ) : (
            <div className="text-sm text-muted-foreground">No filters for this type</div>
          )}
        </aside>

        <main className="flex min-w-0 flex-1 flex-col">
          {/* Active-filters bar — kept above the scroll area (not inside it) so
              it stays visible without competing with the sticky table header. */}
          {s.activeFilterCount > 0 && (
            <div className="shrink-0 border-b border-border/70 bg-background px-3 py-2 sm:px-4">
              <ActiveFacetTags
                items={s.activeTags}
                title={`Active filters (${s.activeFilterCount})`}
                className="px-0"
                onRemove={s.handleRemoveTag}
                onClearAll={s.handleClearAllFilters}
              />
            </div>
          )}
          <div
            ref={resultsScrollRef}
            className="relative flex flex-1 flex-col overflow-auto p-2 sm:p-3"
          >
            {/* Zero-query browse landing — a guided way in (corpus summary +
                browse-by chips) when nothing is searched or filtered yet. */}
            {!s.submittedKeyword &&
              s.activeFilterCount === 0 &&
              s.queryState.offset === 0 &&
              Object.keys(s.data.facets).length > 0 && (
                <SearchLanding
                  className="mb-3"
                  totalCount={s.resultCount}
                  typeLabel={typeLabel}
                  enabledTypes={s.enabledCategories}
                  countsByType={s.countsByType}
                  facets={s.data.facets}
                  dateDistribution={s.timelineDistribution}
                  autoCollapsed={s.viewMode === 'table'}
                  onSelectFacet={(facetKey, value) =>
                    s.handleFacetClick('', { type: 'selectFacet', facetKey, value })
                  }
                  onApplyDateRange={(min, max) =>
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
              )}
            <div className="flex min-h-0 flex-col rounded-xl border border-border/80 bg-card shadow-sm">
              {s.isFetching && !s.isLoading && (
                <div className="h-0.5 w-full shrink-0 overflow-hidden rounded-t-xl">
                  <div className="h-full w-1/3 animate-[search-sweep_1.1s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-accent to-transparent" />
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
                    s.density === 'comfortable' ? (
                      <ResultsMediaList
                        resultType={s.resultType}
                        results={s.filtered as ResultListItem[]}
                        highlightKeyword={s.submittedKeyword}
                        isFetching={s.isFetching}
                      />
                    ) : (
                      <ResultsTable
                        resultType={s.resultType}
                        results={s.filtered as ResultListItem[]}
                        ordering={s.data.ordering}
                        onSort={s.handleSort}
                        highlightKeyword={s.submittedKeyword}
                        visibleColumns={s.categoryConfig.visibleColumns}
                        scrollContainerRef={resultsScrollRef}
                        isFetching={s.isFetching}
                      />
                    )
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
                    />
                  )
                ) : (
                  <section className="flex animate-[search-rise_0.4s_ease-out] flex-col items-center px-6 py-16 text-center">
                    <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full border border-border bg-muted/50 text-muted-foreground/70">
                      <SearchX className="h-6 w-6" />
                    </div>
                    <h3 className="font-display text-2xl font-semibold tracking-tight text-foreground">
                      Nothing in the archive matches
                    </h3>
                    <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                      {s.submittedKeyword
                        ? `No ${typeLabel.toLowerCase()} matched “${s.submittedKeyword}”. Try a broader term or loosen the filters.`
                        : `No ${typeLabel.toLowerCase()} matched the current filters.`}
                    </p>
                    <div className="ornament-divider mt-6 w-44 text-border" aria-hidden />
                    <div className="mt-5 flex flex-wrap justify-center gap-2">
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
              {/* Pagination is a list-view concern only. The timeline, map and
                  charts views are aggregate visualisations of the whole result
                  set, so paging through them is meaningless. */}
              {s.data.count > 0 && (s.viewMode === 'table' || s.viewMode === 'grid') && (
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
    </div>
  );
}
