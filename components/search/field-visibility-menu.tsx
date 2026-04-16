'use client';

import { useMemo } from 'react';
import { SlidersHorizontal, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  SortableCheckboxList,
  type SortableItem,
} from '@/components/backoffice/site-features/sortable-checkbox-list';
import { getFacetOrder, getDefaultVisibleColumns, type ResultType } from '@/lib/search-types';
import { formatFacetTitle } from '@/lib/search-query';

type Props = {
  resultType: ResultType;
  visibleColumns: string[];
  visibleFacets: string[];
  onColumnsChange: (next: string[]) => void;
  onFacetsChange: (next: string[]) => void;
  onReset: () => void;
};

export function FieldVisibilityMenu({
  resultType,
  visibleColumns,
  visibleFacets,
  onColumnsChange,
  onFacetsChange,
  onReset,
}: Props) {
  const columnItems = useMemo<SortableItem[]>(
    () => getDefaultVisibleColumns(resultType).map((col) => ({ id: col, label: col })),
    [resultType]
  );
  const facetItems = useMemo<SortableItem[]>(
    () => getFacetOrder(resultType).map((f) => ({ id: f, label: formatFacetTitle(f, resultType) })),
    [resultType]
  );

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-9 w-9 shrink-0"
          aria-label="Configure visible fields"
          title="Configure visible fields"
        >
          <SlidersHorizontal className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[min(90vw,28rem)]" align="end">
        <div className="flex items-center justify-between pb-2">
          <h4 className="text-sm font-semibold">Fields shown</h4>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onReset}
            className="h-7 gap-1 px-2 text-xs"
          >
            <RotateCcw className="h-3 w-3" />
            Reset
          </Button>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <h5 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Columns
            </h5>
            <SortableCheckboxList
              allItems={columnItems}
              checkedIds={visibleColumns}
              onChangeOrder={onColumnsChange}
            />
          </div>
          <div>
            <h5 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Facets
            </h5>
            <SortableCheckboxList
              allItems={facetItems}
              checkedIds={visibleFacets}
              onChangeOrder={onFacetsChange}
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
