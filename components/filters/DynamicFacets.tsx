'use client'

import * as React from 'react'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { FACET_COMPONENT_MAP } from '@/lib/facet-component-map'
import { FILTER_ORDER_MAP } from '@/lib/filter-order'
import type { FacetData, FacetItem } from '@/types/facets'

type DynamicFacetsProps = {
  facets: FacetData
  renderConfig: Record<string, string>
  suggestionsPool?: string[]
  onFacetClick?: (arg: string) => void
  baseFacetURL: string
}

export function DynamicFacets({
  facets,
  renderConfig,
  suggestionsPool = [],
  onFacetClick,
  baseFacetURL,
}: DynamicFacetsProps) {
  const [activeFacet, setActiveFacet] = React.useState<{ key: string; value: string } | null>(null)
  const [keyword, setKeyword] = React.useState('')
  const [selectedIndex, setSelectedIndex] = React.useState(-1)

  if (!facets || Object.keys(facets).length === 0) {
    return null
  }

  const ordered = FILTER_ORDER_MAP[renderConfig.searchType] || Object.keys(facets)

  const suggestions = React.useMemo(() => {
    if (!keyword) return []
    const low = keyword.toLowerCase()
    return Array.from(
      new Set(
        suggestionsPool
          .filter((s) => s.toLowerCase().startsWith(low) && s.toLowerCase() !== low)
      )
    ).slice(0, 5)
  }, [keyword, suggestionsPool])

  function triggerSearch(kw: string) {
    setKeyword(kw)
    setSelectedIndex(-1)
    onFacetClick?.(kw)
  }

  return (
    <div>
      <div className="p-4">
        <h3 className="font-medium text-sm mb-1">Keyword</h3>
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
          <Input
            className="pl-8"
            placeholder="Type and press Enter…"
            value={keyword}
            onChange={(e) => {
              setKeyword(e.currentTarget.value)
              setSelectedIndex(-1)
            }}
            onKeyDown={(e) => {
              switch (e.key) {
                case 'ArrowDown':
                  e.preventDefault()
                  if (suggestions.length > 0) {
                    setSelectedIndex((si) => (si < suggestions.length - 1 ? si + 1 : 0))
                  }
                  break
                case 'ArrowUp':
                  e.preventDefault()
                  if (suggestions.length > 0) {
                    setSelectedIndex((si) => (si > 0 ? si - 1 : suggestions.length - 1))
                  }
                  break
                case 'Enter':
                  e.preventDefault()
                  if (selectedIndex >= 0 && suggestions[selectedIndex]) {
                    triggerSearch(suggestions[selectedIndex])
                  } else if (keyword.trim()) {
                    triggerSearch(keyword.trim())
                  } else {
                    triggerSearch('')
                  }
                  break
                case 'Escape':
                  setSelectedIndex(-1)
                  break
              }
            }}
          />
          {suggestions.length > 0 && (
            <ul className="absolute z-10 bg-white border mt-1 w-full max-h-40 overflow-auto">
              {suggestions.map((s, i) => (
                <li
                  key={s}
                  className={
                    'px-2 py-1 cursor-pointer ' +
                    (i === selectedIndex ? 'bg-gray-200' : 'hover:bg-gray-100')
                  }
                  onMouseEnter={() => setSelectedIndex(i)}
                  onMouseLeave={() => setSelectedIndex(-1)}
                  onClick={() => triggerSearch(s)}
                >
                  {s}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {ordered.map((facetKey) => {
          const facetItems = facets[facetKey]
          if (!facetItems) return null
          const type = renderConfig[facetKey]
          const Component =
            FACET_COMPONENT_MAP[type as keyof typeof FACET_COMPONENT_MAP]
          if (!Component) return null

          const title = facetKey
            .replace(/_/g, ' ')
            .replace(/\b\w/g, (c) => c.toUpperCase())

          // range facet
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
                  onFacetClick?.(url)
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
              selectedValue={
                activeFacet?.key === facetKey ? activeFacet.value : null
              }
              onSelect={(url, val) => {
                setActiveFacet((curr) =>
                  curr?.key === facetKey && curr.value === val
                    ? null
                    : { key: facetKey, value: val }
                )
                onFacetClick?.(url)
              }}
            />
          )
        })}
      </div>
    </div>
  )
}
