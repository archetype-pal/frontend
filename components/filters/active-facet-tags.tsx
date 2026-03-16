'use client';

import * as React from 'react';
import { X } from 'lucide-react';
import type { ActiveFacetTag } from '@/lib/search-query';

type ActiveFacetTagsProps = {
  items: ActiveFacetTag[];
  title?: string;
  onRemove: (item: ActiveFacetTag) => void;
  onClearAll: () => void;
};

export function ActiveFacetTags({
  items,
  title = 'Active filters',
  onRemove,
  onClearAll,
}: ActiveFacetTagsProps) {
  const [expanded, setExpanded] = React.useState(false);
  const maxVisible = 4;
  const hasOverflow = items.length > maxVisible;
  const visibleItems = expanded || !hasOverflow ? items : items.slice(0, maxVisible);
  const hiddenCount = items.length - maxVisible;
  if (items.length === 0) return null;

  return (
    <section className="px-4 pt-0 pb-0" aria-label={title}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-sm font-medium">{title}</h3>
        {items.length > 1 && (
          <button
            type="button"
            onClick={onClearAll}
            aria-label="Clear all active filters"
            className="text-xs text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 rounded-sm"
          >
            Clear all
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {visibleItems.map((item) => (
          <span
            key={item.id}
            className="inline-flex items-center gap-1 rounded-full border bg-muted px-2 py-1 text-xs text-foreground"
          >
            <span className="max-w-[180px] truncate">{item.label}</span>
            <button
              type="button"
              onClick={() => onRemove(item)}
              className="inline-flex h-4 w-4 items-center justify-center rounded-full text-muted-foreground hover:bg-muted-foreground/20 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
              aria-label={`Remove ${item.label}`}
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        {hasOverflow && (
          <button
            type="button"
            onClick={() => setExpanded((prev) => !prev)}
            className="inline-flex items-center rounded-full border border-dashed px-2 py-1 text-xs text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
            aria-label={
              expanded ? 'Show fewer active filters' : `Show ${hiddenCount} more active filters`
            }
          >
            {expanded ? 'Show less' : `Show ${hiddenCount} more`}
          </button>
        )}
      </div>
    </section>
  );
}
