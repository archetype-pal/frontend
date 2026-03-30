'use client';

import * as React from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
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
  const [isExpanded, setIsExpanded] = React.useState(expanded);
  const [sortBy, setSortBy] = React.useState<'name-asc' | 'name-desc' | 'count-desc' | 'count-asc'>(
    'name-asc'
  );
  const [searchTerm, setSearchTerm] = React.useState('');
  const [expandedList, setExpandedList] = React.useState(false);

  const sortedItems = React.useMemo(() => {
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

  const filteredItems = React.useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return sortedItems;
    return sortedItems.filter((item) => item.label.toLowerCase().includes(q));
  }, [searchTerm, sortedItems]);

  React.useEffect(() => {
    setExpandedList(false);
  }, [searchTerm, sortBy, id]);

  const INITIAL_VISIBLE_COUNT = 10;
  const hasOverflow = filteredItems.length > INITIAL_VISIBLE_COUNT;
  const visibleItems = expandedList ? filteredItems : filteredItems.slice(0, INITIAL_VISIBLE_COUNT);
  const maxCount = React.useMemo(
    () => filteredItems.reduce((max, item) => Math.max(max, item.count), 0),
    [filteredItems]
  );
  const showSparklines = filteredItems.length >= 3 && maxCount > 0;

  const handleSelect = (item: FacetListItem) => {
    const nextValue = selectedValue === item.value ? null : item.value;
    const nextUrl = nextValue ? item.href || baseFacetURL : baseFacetURL;

    onSelect?.(nextUrl, item.value, nextValue === null);
  };

  return (
    <div className="border bg-white rounded shadow-sm" id={`panel-${id}`}>
      <div className="border-b px-4 py-2 flex items-center justify-between">
        <h4 className="text-sm font-semibold">
          {title}
          {total !== undefined && <span className="ml-1 text-muted-foreground">({total})</span>}
        </h4>
        <button
          onClick={() => setIsExpanded((prev) => !prev)}
          aria-label={isExpanded ? 'Collapse' : 'Expand'}
        >
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </button>
      </div>
      {showSort && (
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
      )}
      {isExpanded && (
        <div className="max-h-48 overflow-y-auto">
          <div className="p-2 pb-0">
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={`Search ${title.toLowerCase()}...`}
              className="h-8"
              aria-label={`Search ${title} facets`}
            />
          </div>
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
                  <span className="inline-flex items-center gap-2 shrink-0">
                    <span className="text-muted-foreground">{item.count}</span>
                    {showSparklines && (
                      <span className="h-1.5 w-14 rounded-full bg-muted overflow-hidden">
                        <span
                          className="block h-full bg-primary/60"
                          style={{
                            width: `${Math.max(5, Math.round((item.count / maxCount) * 100))}%`,
                          }}
                        />
                      </span>
                    )}
                  </span>
                </button>
              </li>
            ))}
            {visibleItems.length === 0 && (
              <li className="px-2 py-1 text-xs text-muted-foreground">No matching facet values.</li>
            )}
          </ul>
          {hasOverflow && (
            <div className="px-2 pb-2">
              <button
                type="button"
                className="w-full rounded border border-dashed px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => setExpandedList((prev) => !prev)}
              >
                {expandedList
                  ? 'Show fewer'
                  : `Show all (${filteredItems.length - INITIAL_VISIBLE_COUNT} more)`}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
