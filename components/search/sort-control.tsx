'use client';

import * as React from 'react';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { useTranslations } from 'next-intl';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  buildSortFields,
  humanizeSortField,
  parseOrdering,
  type SearchOrdering,
} from '@/lib/search-sort';

/** Sentinel for the "no explicit sort" option — Radix Select forbids an empty value. */
const RELEVANCE_VALUE = '__relevance__';

type SortControlProps = {
  /** The `ordering` block from the facets response; drives the field list. */
  ordering: SearchOrdering;
  /** The user's explicit choice (`queryState.ordering`), null when unset. */
  value: string | null;
  onChange: (next: { attribute: string | null; descending: boolean }) => void;
  className?: string;
};

/**
 * "Sort by" dropdown plus a direction toggle, available in every view mode.
 *
 * Table view can already sort by clicking column headers, but grid, timeline,
 * map and distribution had no sort affordance at all — and grid is exactly where
 * researchers browse graphs (archetype-pal/frontend#67). The field list comes
 * from the response, never a hardcoded per-type list, so the terms stay
 * customisable per site via the backend registry.
 */
export function SortControl({ ordering, value, onChange, className }: SortControlProps) {
  const t = useTranslations('search');

  const labelFor = React.useCallback(
    (attribute: string) => {
      // A site can add a sortable attribute without shipping a translation for
      // it; fall back to a humanized name rather than rendering a raw key.
      const key = `sortFields.${attribute}`;
      const translated = t.has(key) ? t(key) : '';
      return translated || humanizeSortField(attribute);
    },
    [t]
  );

  const fields = React.useMemo(() => buildSortFields(ordering, labelFor), [ordering, labelFor]);
  const { attribute, descending } = parseOrdering(value);

  // No response yet (or an index with nothing sortable) — render nothing rather
  // than an empty dropdown.
  if (fields.length === 0) return null;

  const selected = attribute && fields.some((f) => f.attribute === attribute) ? attribute : null;
  const directionLabel = descending ? t('sortDescending') : t('sortAscending');

  return (
    <div className={cn('items-center gap-1', className)}>
      <Select
        value={selected ?? RELEVANCE_VALUE}
        onValueChange={(next) =>
          onChange({
            attribute: next === RELEVANCE_VALUE ? null : next,
            // Changing field keeps the current direction, matching legacy behaviour.
            descending,
          })
        }
      >
        <SelectTrigger
          className="h-8 w-[150px] bg-background text-xs"
          aria-label={t('sortByLabel')}
          title={t('sortByLabel')}
        >
          <SelectValue placeholder={t('sortBy')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={RELEVANCE_VALUE} className="text-xs">
            {t('sortRelevance')}
          </SelectItem>
          {fields.map((field) => (
            <SelectItem key={field.attribute} value={field.attribute} className="text-xs">
              {field.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <button
        type="button"
        disabled={!selected}
        // The direction has to live in the accessible NAME: aria-label wins the
        // name computation outright, so a direction carried only by `title` (or
        // only by the arrow icon) is never announced — a screen-reader user hears
        // the identical string in both states and cannot tell which way it sorts.
        aria-label={`${t('sortReverse')} (${directionLabel})`}
        aria-pressed={descending}
        title={`${t('sortReverse')} (${directionLabel})`}
        onClick={() => selected && onChange({ attribute: selected, descending: !descending })}
        className={cn(
          'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border bg-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          selected
            ? 'text-muted-foreground hover:bg-muted hover:text-foreground'
            : 'cursor-not-allowed text-muted-foreground/30'
        )}
      >
        {descending ? <ArrowDown className="h-4 w-4" /> : <ArrowUp className="h-4 w-4" />}
      </button>
    </div>
  );
}
