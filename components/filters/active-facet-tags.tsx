'use client';

import * as React from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ActiveFacetTag } from '@/lib/search-query';
import { useTranslations } from 'next-intl';

type ActiveFacetTagsProps = {
  items: ActiveFacetTag[];
  title?: string;
  onRemove: (item: ActiveFacetTag) => void;
  onClearAll: () => void;
  className?: string;
};

export function ActiveFacetTags({
  items,
  title,
  onRemove,
  onClearAll,
  className,
}: ActiveFacetTagsProps) {
  const t = useTranslations('filters');
  const resolvedTitle = title ?? t('activeTitle');
  const [expanded, setExpanded] = React.useState(false);
  const maxVisible = 4;
  const hasOverflow = items.length > maxVisible;
  const visibleItems = expanded || !hasOverflow ? items : items.slice(0, maxVisible);
  const hiddenCount = items.length - maxVisible;
  if (items.length === 0) return null;

  return (
    <section className={cn('px-4 pt-0 pb-0', className)} aria-label={resolvedTitle}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-sm font-medium">{resolvedTitle}</h3>
        {items.length > 1 && (
          <button
            type="button"
            onClick={onClearAll}
            aria-label={t('clearAllLabel')}
            className="text-xs text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 rounded-sm"
          >
            {t('clearAll')}
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {visibleItems.map((item) => (
          <span
            key={item.id}
            className={cn(
              'inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs text-foreground',
              item.exclude
                ? 'border-destructive/40 bg-destructive/5 line-through decoration-destructive/60'
                : 'bg-muted'
            )}
          >
            <span className="max-w-[180px] truncate">{item.label}</span>
            <button
              type="button"
              onClick={() => onRemove(item)}
              className="inline-flex h-4 w-4 items-center justify-center rounded-full text-muted-foreground hover:bg-muted-foreground/20 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
              aria-label={t('removeTag', { label: item.label })}
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
              expanded ? t('showFewerLabel') : t('showMoreLabel', { count: hiddenCount })
            }
          >
            {expanded ? t('showFewer') : t('showMore', { count: hiddenCount })}
          </button>
        )}
      </div>
    </section>
  );
}
