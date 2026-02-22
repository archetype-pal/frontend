'use client'

import * as React from 'react'
import { FACET_COMPONENT_MAP } from '@/lib/facet-component-map'
import { FILTER_ORDER_MAP } from '@/lib/filter-order'
import { getSelectedForFacet, formatFacetTitle } from '@/lib/search-query'
import { useSearchContext } from '@/contexts/search-context'
import { KeywordSearchInput, useKeywordSuggestions } from '@/components/search/KeywordSearchInput'
import type { FacetData, FacetItem, FacetClickOpts } from '@/types/facets'

type DynamicFacetsProps = {
  facets: FacetData
  renderConfig: Record<string, string>
  selectedFacets?: string[]
  onFacetClick?: (arg: string, opts?: FacetClickOpts) => void
  baseFacetURL: string
  visibleFacets?: string[]
}

export function DynamicFacets({
  facets,
  renderConfig,
  selectedFacets = [],
  onFacetClick,
  baseFacetURL,
  visibleFacets,
}: DynamicFacetsProps) {
  const { keyword, setKeyword, suggestionsPool } = useSearchContext()
  const suggestions = useKeywordSuggestions(keyword, suggestionsPool)

  const triggerSearch = React.useCallback(
    (kw: string) => {
      setKeyword(kw)
      onFacetClick?.(kw)
    },
    [setKeyword, onFacetClick]
  )

  if (!facets || Object.keys(facets).length === 0) {
    return null
  }

  const allOrdered = FILTER_ORDER_MAP[renderConfig.searchType] || Object.keys(facets)
  const ordered = visibleFacets
    ? visibleFacets.filter((k) => allOrdered.includes(k))
    : allOrdered

  return (
    <div className="space-y-4">
      <div className="px-4 pt-0 pb-0">
        <h3 className="font-medium text-sm mb-1">Keyword</h3>
        <KeywordSearchInput
          value={keyword}
          onChange={setKeyword}
          onTriggerSearch={triggerSearch}
          suggestions={suggestions}
          placeholder="Type and press Enter…"
        />
      </div>

      <div className="space-y-4">
        {ordered.map((facetKey) => {
          const facetItems = facets[facetKey]
          if (!facetItems) return null
          const type = renderConfig[facetKey]
          const Component =
            FACET_COMPONENT_MAP[type as keyof typeof FACET_COMPONENT_MAP]
          if (!Component) return null

          const title = formatFacetTitle(facetKey, renderConfig.searchType)

          if (type.startsWith('range')) {
            const cfg = Array.isArray(facetItems)
              ? (facetItems[0] as FacetItem)
              : (facetItems as FacetItem)
            return (
              <Component
                key={facetKey}
                id={facetKey}
                title={title}
                range={cfg.range}
                defaultValue={cfg.defaultValue}
                baseFacetURL={baseFacetURL}
                onSearch={({ min, max, precision, diff }) => {
                  let url = `${baseFacetURL}?min_date=${min}&max_date=${max}`
                  if (precision && diff > 0) {
                    url += `&at_most_or_least=${encodeURIComponent(
                      precision
                    )}&date_diff=${diff}`
                  }
                  onFacetClick?.(url, { merge: true })
                }}
                items={[]}
              />
            )
          }

          // list facet
          const items = Array.isArray(facetItems)
            ? (facetItems as FacetItem[]).map((it) => ({
              label: it.text || it.label || '',
              count: it.count,
              href: it.narrow_url || it.href || '',
              value: it.value ?? it.text ?? '',
            }))
            : []

          return (
            <Component
              key={facetKey}
              id={facetKey}
              title={title}
              total={items.length}
              items={items}
              baseFacetURL={baseFacetURL}
              selectedValue={getSelectedForFacet(selectedFacets, facetKey)}
              onSelect={(url, val, isDeselect) => {
                onFacetClick?.(url, {
                  facetKey,
                  value: val,
                  isDeselect: isDeselect ?? false,
                })
              }}
            />
          )
        })}
      </div>
    </div>
  )
}
