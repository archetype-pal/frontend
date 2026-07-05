'use client';

import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getFacetOrder, getFacetRenderMap, type ResultType } from '@/lib/search-types';
import { getSelectedForFacet, formatFacetTitle, type ActiveFacetTag } from '@/lib/search-query';
import { useSearchContext } from '@/contexts/search-context';
import {
  KeywordSearchInput,
  useKeywordSuggestions,
} from '@/components/search/keyword-search-input';
import { ActiveFacetTags } from '@/components/filters/active-facet-tags';
import type { FacetClickAction, FacetData } from '@/types/facets';
import { FacetPanel } from '@/components/filters/facet-panel';
import { FacetDateRangePanel } from '@/components/filters/facet-date-range-panel';
import { FacetTreePanel } from '@/components/filters/facet-tree-panel';
import {
  clearSearchHistory,
  getSearchHistory,
  type SearchHistoryEntry,
} from '@/lib/search-history';
import { resolveResultTypeLabel } from '@/lib/search-label-helpers';
import { useModelLabels } from '@/contexts/model-labels-context';
import { cn } from '@/lib/utils';

export type DynamicFacetsDensity = 'default' | 'sidebar';

/**
 * Progressive disclosure: how many leading facets stay open by default. The
 * rest collapse so the rail isn't one long scroll (a facet with an active
 * selection always stays open regardless of position).
 */
const PRIMARY_FACET_COUNT = 3;

type DynamicFacetsProps = {
  facets: FacetData;
  searchType: ResultType;
  keyword: string;
  onKeywordChange: (value: string) => void;
  onKeywordSubmit: (value: string) => void;
  exactPhrase?: boolean;
  onExactPhraseChange?: (value: boolean) => void;
  activeTags: ActiveFacetTag[];
  onRemoveTag?: (item: ActiveFacetTag) => void;
  selectedFacets?: string[];
  onClearAllFilters?: () => void;
  onFacetClick?: (arg: string, action?: FacetClickAction) => void;
  baseFacetURL: string;
  visibleFacets?: string[];
  activeFilterCount?: number;
  /** Sidebar omits extra horizontal padding so content aligns with aside padding. */
  density?: DynamicFacetsDensity;
  /**
   * Suppress the inline "Active filters" tag list. The desktop rail sets this
   * because the page renders a sticky active-filters bar above the results
   * instead; the mobile sheet keeps its own tags.
   */
  hideActiveTags?: boolean;
  /**
   * Suppress the main keyword box. The desktop rail sets this because the page
   * promotes a single keyword search into the header; the mobile sheet keeps
   * its own keyword box.
   */
  hideKeyword?: boolean;
  /** Id for the keyword input — distinct per instance to avoid id collisions. */
  keywordInputId?: string;
};

export function DynamicFacets({
  facets,
  searchType,
  keyword,
  onKeywordChange,
  onKeywordSubmit,
  exactPhrase = false,
  onExactPhraseChange,
  activeTags,
  onRemoveTag,
  selectedFacets = [],
  onClearAllFilters,
  onFacetClick,
  baseFacetURL,
  visibleFacets,
  activeFilterCount = 0,
  density = 'default',
  hideActiveTags = false,
  hideKeyword = false,
  keywordInputId = 'search-keyword-input',
}: DynamicFacetsProps) {
  const { suggestionsPool, getServerSuggestions } = useSearchContext();
  const { getLabel } = useModelLabels();
  const [draftKeyword, setDraftKeyword] = React.useState(keyword);
  const [historyItems, setHistoryItems] = React.useState<SearchHistoryEntry[]>([]);
  const localSuggestions = useKeywordSuggestions(draftKeyword, suggestionsPool);
  const deferredKeyword = React.useDeferredValue(draftKeyword);

  // Adjust draft + recent-searches when the keyword prop changes (e.g. a parent
  // submits a search, writing to localStorage via addSearchHistory). React's
  // "store info from previous renders" pattern: set state during render instead
  // of in an effect so the refreshed value renders in the same pass. The
  // localStorage read is also deferred off the very first render below to stay
  // SSR/hydration-safe, then re-read here on every keyword change.
  const [prevKeyword, setPrevKeyword] = React.useState(keyword);
  if (prevKeyword !== keyword) {
    setPrevKeyword(keyword);
    setDraftKeyword(keyword);
    setHistoryItems(getSearchHistory());
  }

  React.useEffect(() => {
    // Deferred localStorage read: getSearchHistory() returns [] during SSR, so a
    // useState initializer would hydrate empty then diverge. Reading after mount
    // avoids the hydration mismatch while seeding the recent-searches list.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot read of an external store (localStorage) post-hydration to avoid an SSR mismatch
    setHistoryItems(getSearchHistory());
  }, []);

  const serverSuggestionsQuery = useQuery({
    queryKey: ['facet-suggestions', searchType, deferredKeyword],
    queryFn: () => getServerSuggestions(deferredKeyword, [searchType]),
    enabled: deferredKeyword.trim().length >= 2,
    staleTime: 30_000,
    retry: false,
  });
  const effectiveSuggestions =
    serverSuggestionsQuery.data && serverSuggestionsQuery.data.length > 0
      ? serverSuggestionsQuery.data
      : localSuggestions;

  const triggerSearch = React.useCallback(
    (kw: string) => {
      setDraftKeyword(kw);
      onKeywordChange(kw);
      onKeywordSubmit(kw);
      onFacetClick?.(kw);
    },
    [onKeywordChange, onKeywordSubmit, onFacetClick]
  );

  const allOrdered = React.useMemo<string[]>(() => [...getFacetOrder(searchType)], [searchType]);
  const renderConfig = React.useMemo(() => getFacetRenderMap(searchType), [searchType]);
  const ordered = React.useMemo(
    () => (visibleFacets ? visibleFacets.filter((k) => allOrdered.includes(k)) : allOrdered),
    [visibleFacets, allOrdered]
  );
  const selectedByFacet = React.useMemo(() => {
    return Object.fromEntries(
      ordered.map((facetKey) => [facetKey, getSelectedForFacet(selectedFacets, facetKey)])
    );
  }, [ordered, selectedFacets]);
  const selectedValuesByFacet = React.useMemo(() => {
    return Object.fromEntries(
      ordered.map((facetKey) => {
        const prefix = `${facetKey}_exact:`;
        return [
          facetKey,
          selectedFacets
            .filter((entry) => entry.startsWith(prefix))
            .map((entry) => entry.slice(prefix.length)),
        ];
      })
    ) as Record<string, string[]>;
  }, [ordered, selectedFacets]);
  // Excluded values (`<facetKey>__not`) come in as active tags flagged exclude.
  // Group them per facet so each panel can surface + revert its own exclusions.
  const excludedByFacet = React.useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const tag of activeTags) {
      if (!tag.exclude) continue;
      (map[tag.facetKey] ??= []).push(tag.value);
    }
    return map;
  }, [activeTags]);

  const renderableFacets = React.useMemo(() => {
    const list = ordered.flatMap((facetKey) => {
      const facetValue = facets[facetKey];
      const type = renderConfig[facetKey];
      if (!facetValue || !type) return [];
      if (
        facetValue.kind === 'list' &&
        facetValue.items.length === 0 &&
        (selectedValuesByFacet[facetKey]?.length ?? 0) === 0 &&
        (excludedByFacet[facetKey]?.length ?? 0) === 0
      ) {
        return [];
      }
      return [{ facetKey, facetValue, type, title: formatFacetTitle(facetKey, searchType) }];
    });
    // Pin the date (range) facet to the top — nearly every query in this corpus
    // is time-scoped. Array.sort is stable, so the rest keep their config order.
    return list.sort(
      (a, b) => (a.facetValue.kind === 'range' ? 0 : 1) - (b.facetValue.kind === 'range' ? 0 : 1)
    );
  }, [ordered, facets, renderConfig, searchType, selectedValuesByFacet, excludedByFacet]);

  if (!facets || Object.keys(facets).length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {!hideActiveTags && (
        <ActiveFacetTags
          items={activeTags}
          title={activeFilterCount > 0 ? `Active filters (${activeFilterCount})` : 'Active filters'}
          className={density === 'sidebar' ? 'px-0' : undefined}
          onRemove={(item) => {
            if (onRemoveTag) {
              onRemoveTag(item);
              return;
            }
            onFacetClick?.('', {
              type: 'deselectFacet',
              facetKey: item.facetKey,
              value: item.value,
            });
          }}
          onClearAll={() => onClearAllFilters?.()}
        />
      )}
      {!hideKeyword && (
        <div className={cn('pt-0 pb-0', density === 'default' && 'px-4')}>
          <h3 className="font-medium text-sm mb-1">Keyword</h3>
          <KeywordSearchInput
            inputId={keywordInputId}
            value={draftKeyword}
            onChange={(value) => {
              setDraftKeyword(value);
              onKeywordChange(value);
            }}
            onTriggerSearch={triggerSearch}
            exactPhrase={exactPhrase}
            onExactPhraseChange={onExactPhraseChange}
            suggestions={effectiveSuggestions}
            placeholder="Type and press Enter…"
            suggestionsLoading={serverSuggestionsQuery.isFetching}
            noSuggestionsText="No keyword suggestions yet. Press Enter to search."
            recentSearches={historyItems.map((entry, idx) => ({
              id: `facet-recent-${idx}-${entry.timestamp}`,
              label: entry.keyword,
              value: entry.keyword,
              meta: resolveResultTypeLabel(entry.resultType, getLabel),
            }))}
            onClearRecentSearches={() => {
              clearSearchHistory();
              setHistoryItems([]);
            }}
          />
        </div>
      )}

      <div className="space-y-4">
        {renderableFacets.map(({ facetKey, facetValue, type, title }, index) => {
          const hasSelection =
            selectedByFacet[facetKey] != null ||
            (selectedValuesByFacet[facetKey]?.length ?? 0) > 0 ||
            (excludedByFacet[facetKey]?.length ?? 0) > 0;
          const defaultExpanded = index < PRIMARY_FACET_COUNT || hasSelection;
          if (facetValue.kind === 'range') {
            return (
              <FacetDateRangePanel
                key={facetKey}
                id={facetKey}
                title={title}
                range={facetValue.range}
                defaultValue={facetValue.defaultValue}
                defaultExpanded={defaultExpanded}
                onSearch={({ min, max, precision, diff }) => {
                  let url = `${baseFacetURL}?min_date=${min}&max_date=${max}`;
                  if (precision && diff > 0) {
                    url += `&at_most_or_least=${encodeURIComponent(precision)}&date_diff=${diff}`;
                  }
                  onFacetClick?.(url, { type: 'mergeDateParams' });
                }}
              />
            );
          }
          if (type === 'tree' && facetValue.kind === 'list') {
            return (
              <FacetTreePanel
                key={facetKey}
                id={facetKey}
                title={title}
                total={facetValue.items.length}
                items={facetValue.items}
                selectedValues={selectedValuesByFacet[facetKey] ?? []}
                defaultExpanded={defaultExpanded}
                onSelect={(value, isDeselect) => {
                  onFacetClick?.(
                    baseFacetURL,
                    isDeselect
                      ? { type: 'deselectFacet', facetKey, value }
                      : { type: 'selectFacet', facetKey, value }
                  );
                }}
              />
            );
          }

          return (
            <FacetPanel
              key={facetKey}
              id={facetKey}
              title={title}
              total={facetValue.items.length}
              items={facetValue.items}
              baseFacetURL={baseFacetURL}
              selectedValue={selectedByFacet[facetKey] ?? null}
              showSort={type !== 'toggle'}
              expanded={defaultExpanded}
              onSelect={(url, val, isDeselect) => {
                onFacetClick?.(
                  url,
                  isDeselect
                    ? { type: 'deselectFacet', facetKey, value: val }
                    : { type: 'selectFacet', facetKey, value: val }
                );
              }}
              onExclude={(val) =>
                onFacetClick?.('', { type: 'excludeFacet', facetKey, value: val })
              }
              excludedValues={excludedByFacet[facetKey] ?? []}
              onRemoveExclude={(val) =>
                onFacetClick?.('', { type: 'removeExclusion', facetKey, value: val })
              }
            />
          );
        })}
      </div>
    </div>
  );
}
