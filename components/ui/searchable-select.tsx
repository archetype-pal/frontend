'use client';

import * as React from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { rankSearchableOptions, type SearchableOption } from '@/lib/searchable-option-ranking';
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';

interface SearchableSelectProps {
  options: SearchableOption[];
  value: string | null;
  onValueChange: (value: string | null) => void;
  placeholder: string;
  searchPlaceholder?: string;
  emptyText?: string;
  clearLabel?: string;
  disabled?: boolean;
  triggerClassName?: string;
  contentClassName?: string;
  onOptionHover?: (value: string | null) => void;
}

export function SearchableSelect({
  options,
  value,
  onValueChange,
  placeholder,
  searchPlaceholder = 'Search...',
  emptyText = 'No results found.',
  clearLabel = 'Clear selection',
  disabled = false,
  triggerClassName,
  contentClassName,
  onOptionHover,
}: SearchableSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');

  const selected = options.find((option) => option.value === value) ?? null;
  const hasSearch = search.trim().length > 0;
  const rankedOptions = React.useMemo(
    () => rankSearchableOptions(options, search),
    [options, search]
  );

  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) {
          setSearch('');
          onOptionHover?.(null);
        }
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={`w-full justify-between font-normal ${triggerClassName ?? ''}`}
        >
          <span className="truncate">{selected?.label ?? placeholder}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent align="start" className={`w-[320px] p-0 ${contentClassName ?? ''}`}>
        <Command shouldFilter={false}>
          <CommandInput value={search} onValueChange={setSearch} placeholder={searchPlaceholder} />
          <CommandList>
            <CommandGroup>
              {!hasSearch ? (
                <CommandItem
                  value="__clear__"
                  onSelect={() => {
                    onValueChange(null);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={`mr-2 h-4 w-4 ${value == null ? 'opacity-100' : 'opacity-0'}`}
                  />
                  <span className="text-muted-foreground">{clearLabel}</span>
                </CommandItem>
              ) : null}

              {rankedOptions.length === 0 ? (
                <div className="py-6 text-center text-sm">{emptyText}</div>
              ) : null}

              {rankedOptions.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  onSelect={() => {
                    onValueChange(option.value);
                    setOpen(false);
                  }}
                  onMouseEnter={() => onOptionHover?.(option.value)}
                  onFocus={() => onOptionHover?.(option.value)}
                >
                  <Check
                    className={`mr-2 h-4 w-4 ${value === option.value ? 'opacity-100' : 'opacity-0'}`}
                  />
                  <span>{option.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
