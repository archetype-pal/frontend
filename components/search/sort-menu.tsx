'use client';

import * as React from 'react';
import { ArrowDownUp, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { stateFromUrl, type QueryState } from '@/lib/search-query';

type Ordering = {
  current: string;
  options: Array<{ name: string; text: string; url: string }>;
};

type SortMenuProps = {
  ordering?: Ordering;
  baseFacetURL: string;
  setQueryState: React.Dispatch<React.SetStateAction<QueryState>>;
};

/**
 * A visible, cross-view sort control. The table also sorts via column headers,
 * but grid/timeline have no headers — this exposes the same server-provided
 * `ordering.options` everywhere. Selecting an option rebuilds the query state
 * from that option's URL (the same mechanism the old Actions→Sort submenu used).
 */
export function SortMenu({ ordering, baseFacetURL, setQueryState }: SortMenuProps) {
  if (!ordering?.options?.length) return null;
  const current = ordering.options.find((option) => option.name === ordering.current);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9 shrink-0 gap-1.5 px-2.5"
          title="Sort results"
          aria-label="Sort results"
        >
          <ArrowDownUp className="h-4 w-4" />
          <span className="hidden max-w-[8rem] truncate text-sm lg:inline">
            {current ? current.text : 'Sort'}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel>Sort by</DropdownMenuLabel>
        {ordering.options.map((option) => (
          <DropdownMenuItem
            key={option.name}
            className="flex items-center gap-2"
            onClick={() => setQueryState(stateFromUrl(option.url, baseFacetURL))}
          >
            {option.name === ordering.current ? (
              <Check className="h-4 w-4 shrink-0" />
            ) : (
              <span className="w-4 shrink-0" />
            )}
            {option.text}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
