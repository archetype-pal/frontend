'use client'

import * as React from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

type FacetItem = {
  label: string
  count: number
  href: string
  active?: boolean
}

type FacetPanelProps = {
  id: string
  title: string
  total?: number
  items: FacetItem[]
  expanded?: boolean
  onToggle?: (id: string) => void
  onSelect?: (url: string) => void
}

export function FacetPanel({
  id,
  title,
  total,
  items,
  expanded: defaultExpanded = true,
  onToggle,
  onSelect,
}: FacetPanelProps) {
  const [isExpanded, setIsExpanded] = React.useState(defaultExpanded)
  const [sortBy, setSortBy] = React.useState<'name-asc' | 'name-desc' | 'count-desc' | 'count-asc'>('name-asc')
  const [selectedItem, setSelectedItem] = React.useState<string | null>(null)

  const toggle = () => {
    setIsExpanded((prev) => !prev)
    onToggle?.(id)
  }

  const sortedItems = React.useMemo(() => {
    const itemsCopy = [...(items ?? [])]

    switch (sortBy) {
      case 'name-asc':
        return itemsCopy.sort((a, b) => a.label.localeCompare(b.label))
      case 'name-desc':
        return itemsCopy.sort((a, b) => b.label.localeCompare(a.label))
      case 'count-asc':
        return itemsCopy.sort((a, b) => a.count - b.count)
      case 'count-desc':
      default:
        return itemsCopy.sort((a, b) => b.count - a.count)
    }
  }, [items, sortBy])

  const visibleItems = selectedItem
    ? sortedItems.filter((item) => item.label === selectedItem)
    : sortedItems

  const handleSelect = (label: string, href: string) => {
    setSelectedItem((current) => {
      const next = current === label ? null : label
      onSelect?.(next ? href : `${process.env.NEXT_PUBLIC_API_URL}/api/v1/search/item-parts/facets`)
      return next
    })
  }

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
      <div className="text-xs text-gray-500 px-4 py-2 flex justify-between border-b">
        <button
          onClick={() =>
            setSortBy(prev =>
              prev === 'name-asc' ? 'name-desc' : 'name-asc'
            )
          }
          className={cn((sortBy === 'name-asc' || sortBy === 'name-desc') && 'font-semibold')}
        >
          {sortBy === 'name-desc' ? 'Z–A' : 'A–Z'}
        </button>
        <button
          onClick={() =>
            setSortBy(prev =>
              prev === 'count-desc' ? 'count-asc' : 'count-desc'
            )
          }
          className={cn((sortBy === 'count-desc' || sortBy === 'count-asc') && 'font-semibold')}
        >
          {sortBy === 'count-asc' ? 'Count ↑' : 'Count ↓'}
        </button>
      </div>

      {isExpanded && (
        <ul className="p-2 space-y-2 text-sm">
          {visibleItems.map((item) => (
            <li key={item.label}>
              <button
                onClick={() => handleSelect(item.label, item.href)}
                aria-label={`${item.label}, ${item.count}`}
                className={cn(
                  'w-full text-left flex justify-between items-center px-2 py-1 rounded hover:bg-muted transition-colors',
                  selectedItem === item.label && 'bg-muted font-semibold'
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
