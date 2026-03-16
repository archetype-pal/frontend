'use client';

import * as React from 'react';
import { SEARCH_RESULT_CONFIG, type FacetRenderType, type ResultType } from '@/lib/search-types';
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

type DynamicFacetsProps = {
  facets: FacetData;
  renderConfig: Record<string, FacetRenderType>;
  searchType: ResultType;
  keyword: string;
  onKeywordChange: (value: string) => void;
  onKeywordSubmit: (value: string) => void;
  activeTags: ActiveFacetTag[];
  onRemoveTag?: (item: ActiveFacetTag) => void;
  selectedFacets?: string[];
  onClearAllFilters?: () => void;
  onFacetClick?: (arg: string, action?: FacetClickAction) => void;
  baseFacetURL: string;
  visibleFacets?: string[];
};

export function DynamicFacets({
  facets,
  renderConfig,
  searchType,
  keyword,
  onKeywordChange,
  onKeywordSubmit,
  activeTags,
  onRemoveTag,
  selectedFacets = [],
  onClearAllFilters,
  onFacetClick,
  baseFacetURL,
  visibleFacets,
}: DynamicFacetsProps) {
  const { suggestionsPool } = useSearchContext();
  const [draftKeyword, setDraftKeyword] = React.useState(keyword);
  const suggestions = useKeywordSuggestions(draftKeyword, suggestionsPool);

  React.useEffect(() => {
    setDraftKeyword(keyword);
  }, [keyword]);

  const triggerSearch = React.useCallback(
    (kw: string) => {
      setDraftKeyword(kw);
      onKeywordChange(kw);
      onKeywordSubmit(kw);
      onFacetClick?.(kw);
    },
    [onKeywordChange, onKeywordSubmit, onFacetClick]
  );

  const allOrdered = React.useMemo<string[]>(
    () => [...SEARCH_RESULT_CONFIG[searchType].filterOrder],
    [searchType]
  );
  const ordered = React.useMemo(
    () => (visibleFacets ? visibleFacets.filter((k) => allOrdered.includes(k)) : allOrdered),
    [visibleFacets, allOrdered]
  );
  const selectedByFacet = React.useMemo(() => {
    return Object.fromEntries(
      ordered.map((facetKey) => [facetKey, getSelectedForFacet(selectedFacets, facetKey)])
    );
  }, [ordered, selectedFacets]);

  if (!facets || Object.keys(facets).length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <ActiveFacetTags
        items={activeTags}
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
      <div className="px-4 pt-0 pb-0">
        <h3 className="font-medium text-sm mb-1">Keyword</h3>
        <KeywordSearchInput
          value={draftKeyword}
          onChange={(value) => {
            setDraftKeyword(value);
            onKeywordChange(value);
          }}
          onTriggerSearch={triggerSearch}
          suggestions={suggestions}
          placeholder="Type and press Enter…"
        />
      </div>

      <div className="space-y-4">
        {ordered.map((facetKey) => {
          const facetValue = facets[facetKey];
          if (!facetValue) return null;
          const type = renderConfig[facetKey];
          if (!type) return null;

          const title = formatFacetTitle(facetKey, searchType);

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

          const items = facetValue.items;

          return (
            <FacetPanel
              key={facetKey}
              id={facetKey}
              title={title}
              total={items.length}
              items={items}
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
            />
          );
        })}
      </div>
    </div>
  );
}
