'use client';

import * as React from 'react';
import { Ban, ChevronDown } from 'lucide-react';
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
  /** Exclude this facet value (NOT filter) */
  onExclude?: (value: string) => void;
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
  onExclude,
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
    <div
      className="overflow-hidden rounded-lg border border-border/60 bg-card/50 transition-colors"
      id={`panel-${id}`}
    >
      <button
        type="button"
        onClick={() => setIsExpanded((prev) => !prev)}
        aria-expanded={isExpanded}
        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left transition-colors hover:bg-muted/40"
      >
        <h4 className="flex items-baseline gap-1.5 font-serif text-[13px] font-semibold tracking-tight text-foreground">
          {title}
          {total !== undefined && (
            <span className="text-[11px] font-normal tabular-nums text-muted-foreground/70">
              {total}
            </span>
          )}
        </h4>
        <ChevronDown
          className={cn(
            'h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200',
            isExpanded ? 'rotate-0' : '-rotate-90'
          )}
        />
      </button>
      {isExpanded && showSort && (
        <div className="flex justify-between border-t border-border/50 px-3 py-1.5 text-[11px] text-muted-foreground">
          <button
            onClick={() => setSortBy((prev) => (prev === 'name-asc' ? 'name-desc' : 'name-asc'))}
            className={cn(
              'rounded px-1 transition-colors hover:text-foreground',
              (sortBy === 'name-asc' || sortBy === 'name-desc') && 'font-semibold text-foreground'
            )}
          >
            {sortBy === 'name-desc' ? 'Z–A' : 'A–Z'}
          </button>
          <button
            onClick={() =>
              setSortBy((prev) => (prev === 'count-desc' ? 'count-asc' : 'count-desc'))
            }
            className={cn(
              'rounded px-1 transition-colors hover:text-foreground',
              (sortBy === 'count-desc' || sortBy === 'count-asc') && 'font-semibold text-foreground'
            )}
          >
            {sortBy === 'count-asc' ? 'Count ↑' : 'Count ↓'}
          </button>
        </div>
      )}
      {isExpanded && (
        <div className="max-h-56 overflow-y-auto border-t border-border/50">
          <div className="p-2 pb-0">
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={`Search ${title.toLowerCase()}…`}
              className="h-8 bg-background/60 text-[13px]"
              aria-label={`Search ${title} facets`}
            />
          </div>
          <ul className="space-y-0.5 p-2 text-[13px]">
            {visibleItems.map((item) => {
              const isSelected = selectedValue === item.value;
              return (
                <li key={item.value} className="flex items-stretch gap-0.5">
                  <button
                    type="button"
                    onClick={() => handleSelect(item)}
                    aria-label={`${item.label}, ${item.count}`}
                    aria-pressed={isSelected}
                    className={cn(
                      'group relative flex min-w-0 flex-1 items-center justify-between gap-2 rounded-md px-2 py-1 text-left transition-colors',
                      isSelected
                        ? 'bg-accent/10 font-semibold text-foreground before:absolute before:inset-y-1 before:left-0 before:w-0.5 before:rounded-full before:bg-accent'
                        : 'hover:bg-muted/60'
                    )}
                  >
                    <span className="min-w-0 flex-1 truncate">{item.label}</span>
                    <span className="inline-flex shrink-0 items-center gap-2">
                      <span className="tabular-nums text-muted-foreground">{item.count}</span>
                      {showSparklines && (
                        <span className="h-1 w-12 overflow-hidden rounded-full bg-foreground/10">
                          <span
                            className={cn(
                              'block h-full rounded-full',
                              isSelected ? 'bg-accent' : 'bg-primary/40'
                            )}
                            style={{
                              width: `${Math.max(5, Math.round((item.count / maxCount) * 100))}%`,
                            }}
                          />
                        </span>
                      )}
                    </span>
                  </button>
                  {onExclude && (
                    <button
                      type="button"
                      title="Exclude this value"
                      aria-label={`Exclude ${item.label}`}
                      className="shrink-0 self-center rounded p-1 text-muted-foreground/70 transition-colors hover:bg-destructive/10 hover:text-destructive"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onExclude(item.value);
                      }}
                    >
                      <Ban className="h-3.5 w-3.5" />
                    </button>
                  )}
                </li>
              );
            })}
            {visibleItems.length === 0 && (
              <li className="px-2 py-1 text-xs text-muted-foreground">No matching facet values.</li>
            )}
          </ul>
          {hasOverflow && (
            <div className="px-2 pb-2">
              <button
                type="button"
                className="w-full rounded-md border border-dashed border-border px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:border-border hover:text-foreground"
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
