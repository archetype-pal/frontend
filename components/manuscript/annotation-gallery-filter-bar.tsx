'use client';

import { useTranslations } from 'next-intl';
import { Check, ListFilter, Users, X } from 'lucide-react';

import { cn } from '@/lib/utils';
import {
  type GalleryFilterState,
  type NamedOption,
  type SortKey,
  EMPTY_FILTERS,
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

/** What the filters can offer: only values present on the image. */
export interface FilterOptions {
  hands: HandOption[];
  features: NamedOption[];
  positions: NamedOption[];
}

interface FilterProps {
  filters: GalleryFilterState;
  onChange: (next: GalleryFilterState) => void;
  options: FilterOptions;
}

/** `list` with `item` added, or removed when it is already there. */
const toggled = <T,>(list: T[], item: T) =>
  list.includes(item) ? list.filter((x) => x !== item) : [...list, item];

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
  options,
  statusCounts,
}: FilterProps & { statusCounts: StatusCounts }) {
  const t = useTranslations('manuscript.gallery');
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
      {options.hands.length > 1 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 gap-1.5">
              <Users className="h-4 w-4" aria-hidden />
              {t('hands')}
              <CountBadge count={filters.hands.length} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="max-h-72 overflow-y-auto">
            <DropdownMenuLabel>{t('filterByHand')}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {options.hands.map((h) => (
              <DropdownMenuCheckboxItem
                key={h.key ?? 'unattributed'}
                checked={filters.hands.includes(h.key)}
                onCheckedChange={() =>
                  onChange({ ...filters, hands: toggled(filters.hands, h.key) })
                }
                onSelect={(e) => e.preventDefault()}
              >
                {h.name}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      <Segmented
        ariaLabel={t('statusLabel')}
        value={filters.status}
        options={statusOptions}
        onChange={(status) => onChange({ ...filters, status })}
        className={TOOLBAR_SEGMENTED}
      />

      {/* Shown even with nothing to offer, so the toolbar keeps its shape and
          says why the filter is empty. */}
      {options.features.length + options.positions.length > 0 ? (
        <MarkupFilter filters={filters} onChange={onChange} options={options} />
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

function CountBadge({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <Badge variant="secondary" className="ml-0.5 px-1.5">
      {count}
    </Badge>
  );
}

function MarkupFilter({ filters, onChange, options }: FilterProps) {
  const t = useTranslations('manuscript.gallery');
  const kinds = [
    { kind: 'features', heading: t('features'), items: options.features },
    { kind: 'positions', heading: t('positions'), items: options.positions },
  ] as const;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 gap-1.5">
          <ListFilter className="h-4 w-4" aria-hidden />
          {t('features')}
          <CountBadge count={filters.features.length + filters.positions.length} />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        <Command>
          <CommandInput placeholder={t('searchFeatures')} />
          <CommandList>
            <CommandEmpty>{t('noFeatureMatches')}</CommandEmpty>
            {kinds.map(
              ({ kind, heading, items }) =>
                items.length > 0 && (
                  <CommandGroup key={kind} heading={heading}>
                    {items.map((item) => (
                      <CommandItem
                        key={item.id}
                        value={`${kind} ${item.name}`}
                        onSelect={() =>
                          onChange({ ...filters, [kind]: toggled(filters[kind], item.id) })
                        }
                      >
                        <Check
                          className={cn(
                            'mr-2 h-4 w-4',
                            filters[kind].includes(item.id) ? 'opacity-100' : 'opacity-0'
                          )}
                        />
                        {item.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )
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

// Renders the chips inline (no wrapper) so they flow in the summary line.
export function GalleryFilterChips({ filters, onChange, options }: FilterProps) {
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
    const name =
      options.hands.find((o) => o.key === h)?.name ??
      (h === null ? t('unattributed') : t('handFallback', { id: h }));
    chips.push({
      key: `hand-${h ?? 'unattributed'}`,
      label: t('chipHand', { value: name }),
      remove: () => onChange({ ...filters, hands: toggled(filters.hands, h) }),
    });
  }
  if (filters.status !== 'all') {
    chips.push({
      key: 'status',
      label: filters.status === 'described' ? t('statusDescribed') : t('statusUndescribed'),
      remove: () => onChange({ ...filters, status: 'all' }),
    });
  }
  for (const kind of ['features', 'positions'] as const) {
    for (const id of filters[kind]) {
      const name =
        options[kind].find((o) => o.id === id)?.name ??
        t(kind === 'features' ? 'featureFallback' : 'positionFallback', { id });
      chips.push({
        key: `${kind}-${id}`,
        label: t(kind === 'features' ? 'chipFeature' : 'chipPosition', { value: name }),
        remove: () => onChange({ ...filters, [kind]: toggled(filters[kind], id) }),
      });
    }
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
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs"
          onClick={() => onChange(EMPTY_FILTERS)}
        >
          {t('clearAll')}
        </Button>
      )}
    </>
  );
}
