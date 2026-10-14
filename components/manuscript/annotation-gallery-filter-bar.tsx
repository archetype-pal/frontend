'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { Check, ListFilter, Users, X } from 'lucide-react';

import { cn } from '@/lib/utils';
import {
  type GalleryFilterState,
  type NamedOption,
  type SortKey,
  SORT_KEYS,
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Segmented, type SegmentedOption } from '@/components/ui/segmented';

export interface HandOption {
  key: number | null;
  name: string;
}

/** Segmented toggles stretch to the toolbar's 36px control height. */
export const TOOLBAR_SEGMENTED = 'h-9 [&>button]:h-full';

/** How many graphs on the image each description status would show. */
export type StatusCounts = Record<GalleryFilterState['status'], number>;

interface GalleryFilterControlsProps {
  filters: GalleryFilterState;
  onChange: (next: GalleryFilterState) => void;
  handOptions: HandOption[];
  featureOptions: NamedOption[];
  positionOptions: NamedOption[];
  statusCounts: StatusCounts;
}

const SORT_MESSAGE_KEYS: Record<SortKey, 'sortAz' | 'sortZa' | 'sortMost' | 'sortFewest'> = {
  'allograph-asc': 'sortAz',
  'allograph-desc': 'sortZa',
  'count-desc': 'sortMost',
  'count-asc': 'sortFewest',
};

// The hand/status/feature/sort controls that sit inline in the gallery
// toolbar, next to the allograph search input.
export function GalleryFilterControls({
  filters,
  onChange,
  handOptions,
  featureOptions,
  positionOptions,
  statusCounts,
}: GalleryFilterControlsProps) {
  const t = useTranslations('manuscript.gallery');
  const toggleHand = (key: number | null) => {
    const has = filters.hands.includes(key);
    onChange({
      ...filters,
      hands: has ? filters.hands.filter((h) => h !== key) : [...filters.hands, key],
    });
  };

  const statusOptions: SegmentedOption<GalleryFilterState['status']>[] = (
    [
      ['all', t('statusAll')],
      ['described', t('statusDescribed')],
      ['undescribed', t('statusUndescribed')],
    ] as const
  ).map(([value, label]) => ({
    value,
    label: (
      <>
        {label} <span className="tabular-nums opacity-70">{statusCounts[value]}</span>
      </>
    ),
  }));

  return (
    <>
      {/* Hand filter */}
      {handOptions.length > 1 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 gap-1.5">
              <Users className="h-4 w-4" aria-hidden />
              {t('hands')}
              {filters.hands.length > 0 && (
                <Badge variant="secondary" className="ml-0.5 px-1.5">
                  {filters.hands.length}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="max-h-72 overflow-y-auto">
            <DropdownMenuLabel>{t('filterByHand')}</DropdownMenuLabel>
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
      <Segmented
        ariaLabel={t('statusLabel')}
        value={filters.status}
        options={statusOptions}
        onChange={(status) => onChange({ ...filters, status })}
        className={TOOLBAR_SEGMENTED}
      />

      {/* Feature / position filter. Shown even with nothing to offer, so the
          toolbar keeps its shape and says why the filter is empty. */}
      {featureOptions.length + positionOptions.length > 0 ? (
        <MarkupFilter
          filters={filters}
          onChange={onChange}
          featureOptions={featureOptions}
          positionOptions={positionOptions}
        />
      ) : (
        <Button
          variant="outline"
          size="sm"
          className="h-9 gap-1.5 border-dashed"
          disabled
          title={t('featuresNoneTitle')}
        >
          <ListFilter className="h-4 w-4" aria-hidden />
          {t('features')}
          <span className="font-normal text-muted-foreground">{t('featuresNone')}</span>
        </Button>
      )}

      {/* Sort */}
      <label className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
        {t('sort')}
        <select
          value={filters.sort}
          onChange={(e) => onChange({ ...filters, sort: e.target.value as SortKey })}
          className="h-9 rounded-md border border-input bg-background px-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          {SORT_KEYS.map((key) => (
            <option key={key} value={key}>
              {t(SORT_MESSAGE_KEYS[key])}
            </option>
          ))}
        </select>
      </label>
    </>
  );
}

function MarkupFilter({
  filters,
  onChange,
  featureOptions,
  positionOptions,
}: {
  filters: GalleryFilterState;
  onChange: (next: GalleryFilterState) => void;
  featureOptions: NamedOption[];
  positionOptions: NamedOption[];
}) {
  const t = useTranslations('manuscript.gallery');
  const activeCount = filters.features.length + filters.positions.length;
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
          <ListFilter className="h-4 w-4" aria-hidden />
          {t('features')}
          {activeCount > 0 && (
            <Badge variant="secondary" className="ml-0.5 px-1.5">
              {activeCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        <Command>
          <CommandInput placeholder={t('searchFeatures')} />
          <CommandList>
            <CommandEmpty>{t('noFeatureMatches')}</CommandEmpty>
            {featureOptions.length > 0 && (
              <CommandGroup heading={t('features')}>
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
              <CommandGroup heading={t('positions')}>
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

// Renders the chips inline (no wrapper) so they flow in the summary line.
export function GalleryFilterChips({
  filters,
  onChange,
  onClearAll,
  handLabel,
  featureLabel,
  positionLabel,
}: GalleryFilterChipsProps) {
  const t = useTranslations('manuscript.gallery');
  const chips: { key: string; label: string; remove: () => void }[] = [];

  if (filters.allograph.trim()) {
    chips.push({
      key: 'allograph',
      label: t('chipAllograph', { value: filters.allograph.trim() }),
      remove: () => onChange({ ...filters, allograph: '' }),
    });
  }
  for (const h of filters.hands) {
    chips.push({
      key: `hand-${h ?? 'unattributed'}`,
      label: t('chipHand', { value: handLabel(h) }),
      remove: () => onChange({ ...filters, hands: filters.hands.filter((x) => x !== h) }),
    });
  }
  if (filters.status !== 'all') {
    chips.push({
      key: 'status',
      label: filters.status === 'described' ? t('statusDescribed') : t('statusUndescribed'),
      remove: () => onChange({ ...filters, status: 'all' }),
    });
  }
  for (const id of filters.features) {
    chips.push({
      key: `feature-${id}`,
      label: t('chipFeature', { value: featureLabel(id) }),
      remove: () => onChange({ ...filters, features: filters.features.filter((x) => x !== id) }),
    });
  }
  for (const id of filters.positions) {
    chips.push({
      key: `position-${id}`,
      label: t('chipPosition', { value: positionLabel(id) }),
      remove: () => onChange({ ...filters, positions: filters.positions.filter((x) => x !== id) }),
    });
  }

  if (chips.length === 0) return null;

  return (
    <>
      {chips.map((chip) => (
        <Badge
          key={chip.key}
          variant="secondary"
          className="gap-1 py-0.5 pl-2.5 pr-1 font-normal text-foreground"
        >
          {chip.label}
          <button
            type="button"
            onClick={chip.remove}
            aria-label={t('removeFilter', { label: chip.label })}
            className="rounded-full p-0.5 hover:bg-background/60"
          >
            <X className="h-3 w-3" aria-hidden />
          </button>
        </Badge>
      ))}
      {chips.length > 1 && (
        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={onClearAll}>
          {t('clearAll')}
        </Button>
      )}
    </>
  );
}
