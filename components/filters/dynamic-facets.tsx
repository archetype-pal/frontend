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
import { FacetDateRangePanel } from '@/components/filters/FacetDateRangePanel';
import { FacetTreePanel } from '@/components/filters/facet-tree-panel';
import { clearSearchHistory, getSearchHistory } from '@/lib/search-history';
import { SEARCH_RESULT_CONFIG } from '@/lib/search-types';
import { cn } from '@/lib/utils';

export type DynamicFacetsDensity = 'default' | 'sidebar';

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
}: DynamicFacetsProps) {
  const { suggestionsPool, getServerSuggestions } = useSearchContext();
  const [draftKeyword, setDraftKeyword] = React.useState(keyword);
  const [historyItems, setHistoryItems] = React.useState(() => getSearchHistory());
  const localSuggestions = useKeywordSuggestions(draftKeyword, suggestionsPool);
  const deferredKeyword = React.useDeferredValue(draftKeyword);

  React.useEffect(() => {
    setDraftKeyword(keyword);
    setHistoryItems(getSearchHistory());
  }, [keyword]);

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

  const renderableFacets = React.useMemo(
    () =>
      ordered.flatMap((facetKey) => {
        const facetValue = facets[facetKey];
        const type = renderConfig[facetKey];
        if (!facetValue || !type) return [];
        if (
          facetValue.kind === 'list' &&
          facetValue.items.length === 0 &&
          (selectedValuesByFacet[facetKey]?.length ?? 0) === 0
        ) {
          return [];
        }
        return [{ facetKey, facetValue, type, title: formatFacetTitle(facetKey, searchType) }];
      }),
    [ordered, facets, renderConfig, searchType, selectedValuesByFacet]
  );

  if (!facets || Object.keys(facets).length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
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
      <div className={cn('pt-0 pb-0', density === 'default' && 'px-4')}>
        <h3 className="font-medium text-sm mb-1">Keyword</h3>
        <KeywordSearchInput
          inputId="search-keyword-input"
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
            meta: SEARCH_RESULT_CONFIG[entry.resultType].label,
          }))}
          onClearRecentSearches={() => {
            clearSearchHistory();
            setHistoryItems([]);
          }}
        />
      </div>

      <div className="space-y-4">
        {renderableFacets.map(({ facetKey, facetValue, type, title }) => {
          if (facetValue.kind === 'range') {
            return (
              <FacetDateRangePanel
                key={facetKey}
                id={facetKey}
                title={title}
                range={facetValue.range}
                defaultValue={facetValue.defaultValue}
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
            />
          );
        })}
      </div>
    </div>
  );
}
