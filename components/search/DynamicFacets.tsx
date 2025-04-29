'use client'

import * as React from 'react'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { FACET_COMPONENT_MAP } from '@/lib/facet-component-map'
import { FILTER_ORDER_MAP } from './filter-order'

type DynamicFacetsProps = {
  facets: Record<string, any>
  renderConfig: Record<string, string>
  onFacetClick?: (url: string) => void
}
export function DynamicFacets({ facets, renderConfig, onFacetClick }: DynamicFacetsProps) {
  const orderedKeys = FILTER_ORDER_MAP[renderConfig.searchType] || Object.keys(facets)

  return (
    <div>
      <div className='p-4'>
        <div className='space-y-2'>
          <h3 className='font-medium text-sm'>Keywords</h3>
          <div className='relative'>
            <Search className='absolute left-2 top-2.5 h-4 w-4 text-gray-400' />
            <Input className='pl-8' placeholder='Search...' />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {/* {Object.entries(facets).map(([facetKey, facetItems]) => { */}
        {orderedKeys.map((facetKey) => {
          const facetItems = facets[facetKey]
          if (!facetItems) return null

          const componentType = renderConfig[facetKey]
          const Component = FACET_COMPONENT_MAP[componentType]
          if (!Component) return null

          if (componentType.startsWith('range')) {
            const config = Array.isArray(facetItems) ? facetItems[0] : {}
            return (
              <Component
                key={facetKey}
                id={facetKey}
                title={
                  facetKey
                    .replace(/_/g, ' ')
                    .replace(/\b\w/g, char => char.toUpperCase())
                }
                range={config.range}
                defaultValue={config.defaultValue}
              />
            )
          }

          const items = Array.isArray(facetItems)
            ? facetItems.map((item: any) => ({
              label: item.text || item.label || '',
              count: item.count,
              href: item.narrow_url || item.href || '',
              value: item.value ?? item.text ?? '',
            }))
            : []

          return (
            <Component
              key={facetKey}
              id={facetKey}
              title={
                facetKey
                .replace(/_/g, ' ')
                .replace(/\b\w/g, char => char.toUpperCase())
              }
              total={items.length}
              items={items}
              onSelect={(url: string) => onFacetClick?.(url)}
            />
          )
        })}
      </div>

    </div>
  )
}
