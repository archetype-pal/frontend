'use client'

import * as React from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

type RadioFacetItem = {
  label: string
  count: number
  value: string
  href: string
}

type FacetRadioPanelProps = {
  id: string
  title: string
  total?: number
  items?: RadioFacetItem[]
  expanded?: boolean
  onSelect?: (url: string, value: string, isDeselect?: boolean) => void
  baseFacetURL: string
  selectedValue?: string | null
}

export function FacetRadioPanel({
  id,
  title,
  total,
  items = [],
  expanded: defaultExpanded = true,
  onSelect,
  baseFacetURL,
  selectedValue,
}: FacetRadioPanelProps) {
  const [isExpanded, setIsExpanded] = React.useState(defaultExpanded)

  const toggle = () => setIsExpanded((prev) => !prev)

  const handleSelect = (item: RadioFacetItem) => {
    const nextValue = selectedValue === item.value ? null : item.value
    const nextUrl = nextValue ? item.href || baseFacetURL : baseFacetURL

    onSelect?.(nextUrl, item.value, nextValue === null)
  }

  const visibleItems = items

  return (
    <div className="border bg-white rounded shadow-sm" id={`panel-${id}`}>
      <div className="border-b px-4 py-2 flex items-center justify-between">
        <h4 className="text-sm font-semibold">
          {title}
          {total !== undefined && <span className="ml-1 text-muted-foreground">({total})</span>}
        </h4>
        <button onClick={toggle} aria-label={isExpanded ? 'Collapse' : 'Expand'}>
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </button>
      </div>

      {isExpanded && visibleItems.length > 0 && (
        <ul className="p-2 space-y-2 text-sm">
          {visibleItems.map((item) => (
            <li key={item.value}>
              <button
                onClick={() => handleSelect(item)}
                className={cn(
                  'w-full text-left flex justify-between items-center px-2 py-1 rounded hover:bg-muted transition-colors',
                  selectedValue === item.value && 'bg-muted font-semibold'
                )}
              >
                <span>{item.label}</span>
                <span className="text-muted-foreground">{item.count}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
