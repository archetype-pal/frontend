'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/auth-context';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { Check, ChevronsUpDown, Plus, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { getPlaces, createPlace } from '@/services/backoffice/manuscripts';
import { backofficeKeys } from '@/lib/backoffice/query-keys';
import { formatApiError } from '@/lib/backoffice/format-api-error';
import type { BackofficePlace } from '@/types/backoffice';

interface PlaceComboboxProps {
  value: number | null;
  onChange: (placeId: number | null, place?: BackofficePlace) => void;
  /** Authoritative display label for the selected value (avoids needing the full list to render). */
  selectedLabel?: string | null;
  className?: string;
}

/**
 * Place-authority picker for Hand.place (archetype-pal/frontend#124): a
 * searchable list of existing Place rows, with an inline "create new place"
 * form for names not yet in the authority list.
 */
export function PlaceCombobox({ value, onChange, selectedLabel, className }: PlaceComboboxProps) {
  const { token } = useAuth();
  const t = useTranslations('backoffice');
  const tCommon = useTranslations('common');
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');

  const { data: placesData } = useQuery({
    queryKey: backofficeKeys.places.all(),
    queryFn: () => getPlaces(token!),
    enabled: !!token && open,
  });

  const places: BackofficePlace[] = placesData ?? [];
  const selected = places.find((p) => p.id === value);
  const displayValue = value != null ? selectedLabel ?? selected?.name ?? null : null;

  const createMut = useMutation({
    mutationFn: () => createPlace(token!, { name: newName.trim() }),
    onSuccess: (data) => {
      toast.success(t('handsDetail.placeCreated'));
      queryClient.invalidateQueries({ queryKey: backofficeKeys.places.all() });
      onChange(data.id, data);
      setCreating(false);
      setNewName('');
      setOpen(false);
    },
    onError: (err) => {
      toast.error(t('handsDetail.placeCreateFailed'), {
        description: formatApiError(err),
      });
    },
  });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            'w-full justify-between font-normal',
            !displayValue && 'text-muted-foreground',
            className
          )}
        >
          <span className="truncate">{displayValue ?? t('handsDetail.selectPlacePlaceholder')}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-0" align="start">
        {creating ? (
          <div className="p-3 space-y-3">
            <p className="text-sm font-medium">{t('handsDetail.newPlace')}</p>
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder={t('handsDetail.placeNamePlaceholder')}
              className="h-8 text-sm"
              autoFocus
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                className="h-7 text-xs"
                onClick={() => createMut.mutate()}
                disabled={!newName.trim() || createMut.isPending}
              >
                {createMut.isPending && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                {tCommon('create')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={() => setCreating(false)}
              >
                {tCommon('cancel')}
              </Button>
            </div>
          </div>
        ) : (
          <Command>
            <CommandInput placeholder={t('handsDetail.searchPlacePlaceholder')} />
            <CommandList>
              <CommandEmpty>{t('handsDetail.noPlacesFound')}</CommandEmpty>
              <CommandGroup>
                <CommandItem
                  value="__none__"
                  onSelect={() => {
                    onChange(null);
                    setOpen(false);
                  }}
                >
                  <Check className={cn('mr-2 h-4 w-4', value == null ? 'opacity-100' : 'opacity-0')} />
                  <span className="text-muted-foreground">{t('handsDetail.selectNoPlace')}</span>
                </CommandItem>
                {places.map((p) => (
                  <CommandItem
                    key={p.id}
                    value={p.name}
                    onSelect={() => {
                      onChange(p.id, p);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn('mr-2 h-4 w-4', value === p.id ? 'opacity-100' : 'opacity-0')}
                    />
                    <span>{p.name}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandSeparator />
              <CommandGroup>
                <CommandItem onSelect={() => setCreating(true)} className="text-primary">
                  <Plus className="mr-2 h-4 w-4" />
                  {t('handsDetail.createNewPlace')}
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        )}
      </PopoverContent>
    </Popover>
  );
}
