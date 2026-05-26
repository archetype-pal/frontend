'use client';

import * as React from 'react';
import { ArrowDownWideNarrow, Check, ListFilter, Users, X } from 'lucide-react';

import { cn } from '@/lib/utils';
import {
  type GalleryFilterState,
  type NamedOption,
  type SortKey,
  SORT_KEYS,
  SORT_LABELS,
} from '@/lib/annotation-gallery-filters';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

export interface HandOption {
  key: number | null;
  name: string;
}

interface GalleryFilterControlsProps {
  filters: GalleryFilterState;
  onChange: (next: GalleryFilterState) => void;
  handOptions: HandOption[];
  featureOptions: NamedOption[];
  positionOptions: NamedOption[];
}

const STATUS_OPTIONS: { value: GalleryFilterState['status']; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'described', label: 'Described' },
  { value: 'undescribed', label: 'Undescribed' },
];

// The hand/status/feature/sort controls that sit inline in the gallery
// toolbar, next to the allograph search input.
export function GalleryFilterControls({
  filters,
  onChange,
  handOptions,
  featureOptions,
  positionOptions,
}: GalleryFilterControlsProps) {
  const toggleHand = (key: number | null) => {
    const has = filters.hands.includes(key);
    onChange({
      ...filters,
      hands: has ? filters.hands.filter((h) => h !== key) : [...filters.hands, key],
    });
  };

  const markupActive = filters.features.length + filters.positions.length;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Hand filter */}
      {handOptions.length > 1 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 gap-1.5">
              <Users className="h-4 w-4" />
              Hands
              {filters.hands.length > 0 && (
                <Badge variant="secondary" className="ml-0.5 px-1.5">
                  {filters.hands.length}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="max-h-72 overflow-y-auto">
            <DropdownMenuLabel>Filter by hand</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {handOptions.map((h) => (
              <DropdownMenuCheckboxItem
                key={h.key ?? 'unattributed'}
                checked={filters.hands.includes(h.key)}
                onCheckedChange={() => toggleHand(h.key)}
                onSelect={(e) => e.preventDefault()}
              >
                {h.name}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* Description status */}
      <div
        role="radiogroup"
        aria-label="Description status"
        className="inline-flex overflow-hidden rounded-md border"
      >
        {STATUS_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={filters.status === opt.value}
            onClick={() => onChange({ ...filters, status: opt.value })}
            className={cn(
              'border-l px-2.5 py-1.5 text-xs font-medium transition first:border-l-0',
              filters.status === opt.value
                ? 'bg-primary text-primary-foreground'
                : 'bg-background text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Feature / position filter */}
      {featureOptions.length + positionOptions.length > 0 && (
        <MarkupFilter
          filters={filters}
          onChange={onChange}
          featureOptions={featureOptions}
          positionOptions={positionOptions}
          activeCount={markupActive}
        />
      )}

      {/* Sort */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-9 gap-1.5">
            <ArrowDownWideNarrow className="h-4 w-4" />
            <span className="hidden sm:inline">{SORT_LABELS[filters.sort]}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Sort allographs</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuRadioGroup
            value={filters.sort}
            onValueChange={(v) => onChange({ ...filters, sort: v as SortKey })}
          >
            {SORT_KEYS.map((key) => (
              <DropdownMenuRadioItem key={key} value={key}>
                {SORT_LABELS[key]}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function MarkupFilter({
  filters,
  onChange,
  featureOptions,
  positionOptions,
  activeCount,
}: {
  filters: GalleryFilterState;
  onChange: (next: GalleryFilterState) => void;
  featureOptions: NamedOption[];
  positionOptions: NamedOption[];
  activeCount: number;
}) {
  const toggle = (kind: 'features' | 'positions', id: number) => {
    const current = filters[kind];
    const has = current.includes(id);
    onChange({
      ...filters,
      [kind]: has ? current.filter((x) => x !== id) : [...current, id],
    });
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 gap-1.5">
          <ListFilter className="h-4 w-4" />
          Features
          {activeCount > 0 && (
            <Badge variant="secondary" className="ml-0.5 px-1.5">
              {activeCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        <Command>
          <CommandInput placeholder="Search features / positions…" />
          <CommandList>
            <CommandEmpty>No matches.</CommandEmpty>
            {featureOptions.length > 0 && (
              <CommandGroup heading="Features">
                {featureOptions.map((f) => (
                  <CommandItem
                    key={`f-${f.id}`}
                    value={`feature ${f.name}`}
                    onSelect={() => toggle('features', f.id)}
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        filters.features.includes(f.id) ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    {f.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {positionOptions.length > 0 && (
              <CommandGroup heading="Positions">
                {positionOptions.map((p) => (
                  <CommandItem
                    key={`p-${p.id}`}
                    value={`position ${p.name}`}
                    onSelect={() => toggle('positions', p.id)}
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        filters.positions.includes(p.id) ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    {p.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// ---------------------------------------------------------------------------
// Active-filter chips (G6.3)
// ---------------------------------------------------------------------------

interface GalleryFilterChipsProps {
  filters: GalleryFilterState;
  onChange: (next: GalleryFilterState) => void;
  onClearAll: () => void;
  handLabel: (key: number | null) => string;
  featureLabel: (id: number) => string;
  positionLabel: (id: number) => string;
}

export function GalleryFilterChips({
  filters,
  onChange,
  onClearAll,
  handLabel,
  featureLabel,
  positionLabel,
}: GalleryFilterChipsProps) {
  const chips: { key: string; label: string; remove: () => void }[] = [];

  if (filters.allograph.trim()) {
    chips.push({
      key: 'allograph',
      label: `Allograph: “${filters.allograph.trim()}”`,
      remove: () => onChange({ ...filters, allograph: '' }),
    });
  }
  for (const h of filters.hands) {
    chips.push({
      key: `hand-${h ?? 'unattributed'}`,
      label: `Hand: ${handLabel(h)}`,
      remove: () => onChange({ ...filters, hands: filters.hands.filter((x) => x !== h) }),
    });
  }
  if (filters.status !== 'all') {
    chips.push({
      key: 'status',
      label: filters.status === 'described' ? 'Described' : 'Undescribed',
      remove: () => onChange({ ...filters, status: 'all' }),
    });
  }
  for (const id of filters.features) {
    chips.push({
      key: `feature-${id}`,
      label: `Feature: ${featureLabel(id)}`,
      remove: () => onChange({ ...filters, features: filters.features.filter((x) => x !== id) }),
    });
  }
  for (const id of filters.positions) {
    chips.push({
      key: `position-${id}`,
      label: `Position: ${positionLabel(id)}`,
      remove: () => onChange({ ...filters, positions: filters.positions.filter((x) => x !== id) }),
    });
  }

  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {chips.map((chip) => (
        <Badge key={chip.key} variant="secondary" className="gap-1 py-1 pl-2.5 pr-1">
          {chip.label}
          <button
            type="button"
            onClick={chip.remove}
            aria-label={`Remove filter ${chip.label}`}
            className="rounded-full p-0.5 hover:bg-background/60"
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}
      {chips.length > 1 && (
        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onClearAll}>
          Clear all
        </Button>
      )}
    </div>
  );
}
