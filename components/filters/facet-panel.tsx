'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { FacetPanelContainer } from '@/components/filters/facet-panel-container';
import type { FacetListItem } from '@/types/facets';

type FacetPanelProps = {
  id: string;
  title: string;
  total?: number;
  items: FacetListItem[];
  expanded?: boolean;
  onSelect?: (url: string, value: string, isDeselect?: boolean) => void;
  baseFacetURL: string;
  selectedValue?: string | null;
  showSort?: boolean;
};

export function FacetPanel({
  id,
  title,
  total,
  items,
  expanded = true,
  onSelect,
  baseFacetURL,
  selectedValue,
  showSort = true,
}: FacetPanelProps) {
  const [sortBy, setSortBy] = React.useState<'name-asc' | 'name-desc' | 'count-desc' | 'count-asc'>(
    'name-asc'
  );

  const visibleItems = React.useMemo(() => {
    if (!showSort) return items;
    const itemsCopy = [...items];
    switch (sortBy) {
      case 'name-asc':
        return itemsCopy.sort((a, b) => a.label.localeCompare(b.label));
      case 'name-desc':
        return itemsCopy.sort((a, b) => b.label.localeCompare(a.label));
      case 'count-asc':
        return itemsCopy.sort((a, b) => a.count - b.count);
      case 'count-desc':
      default:
        return itemsCopy.sort((a, b) => b.count - a.count);
    }
  }, [items, showSort, sortBy]);

  const handleSelect = (item: FacetListItem) => {
    const nextValue = selectedValue === item.value ? null : item.value;
    const nextUrl = nextValue ? item.href || baseFacetURL : baseFacetURL;

    onSelect?.(nextUrl, item.value, nextValue === null);
  };

  return (
    <FacetPanelContainer
      id={id}
      title={title}
      total={total}
      defaultExpanded={expanded}
      controls={
        showSort ? (
          <div className="text-xs text-gray-500 px-4 py-2 flex justify-between border-b">
            <button
              onClick={() => setSortBy((prev) => (prev === 'name-asc' ? 'name-desc' : 'name-asc'))}
              className={cn((sortBy === 'name-asc' || sortBy === 'name-desc') && 'font-semibold')}
            >
              {sortBy === 'name-desc' ? 'Z–A' : 'A–Z'}
            </button>
            <button
              onClick={() =>
                setSortBy((prev) => (prev === 'count-desc' ? 'count-asc' : 'count-desc'))
              }
              className={cn((sortBy === 'count-desc' || sortBy === 'count-asc') && 'font-semibold')}
            >
              {sortBy === 'count-asc' ? 'Count ↑' : 'Count ↓'}
            </button>
          </div>
        ) : null
      }
    >
      <div className="max-h-48 overflow-y-auto">
        <ul className="p-2 space-y-2 text-sm">
          {visibleItems.map((item) => (
            <li key={item.label}>
              <button
                onClick={() => handleSelect(item)}
                aria-label={`${item.label}, ${item.count}`}
                className={cn(
                  'w-full text-left flex justify-between items-center px-2 py-1 rounded hover:bg-muted transition-colors gap-2',
                  selectedValue === item.value && 'bg-muted font-semibold'
                )}
              >
                <span className="truncate min-w-0 flex-1">{item.label}</span>
                <span className="text-muted-foreground shrink-0">{item.count}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </FacetPanelContainer>
  );
}
