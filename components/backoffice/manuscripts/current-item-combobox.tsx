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
} from '@/components/ui/command';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  getCurrentItems,
  createCurrentItem,
  getRepositories,
} from '@/services/backoffice/manuscripts';
import { backofficeKeys } from '@/lib/backoffice/query-keys';
import { formatApiError } from '@/lib/backoffice/format-api-error';
import type { CurrentItemOption, Repository } from '@/types/backoffice';
import { useModelLabels } from '@/contexts/model-labels-context';
import { useDebouncedSearch } from '@/hooks/backoffice/use-debounced-search';

const SEARCH_LIMIT = 50;

function itemLabel(item: CurrentItemOption) {
  return `${item.repository_name} ${item.shelfmark}`;
}

interface CurrentItemComboboxProps {
  value: number | null;
  onChange: (currentItemId: number | null, currentItem?: CurrentItemOption) => void;
  /** Pre-filter by repository (optional). */
  repositoryId?: number;
  /** Saved label of the value, shown until another item is picked here. */
  selectedLabel?: string | null;
  className?: string;
}

export function CurrentItemCombobox({
  value,
  onChange,
  repositoryId,
  selectedLabel,
  className,
}: CurrentItemComboboxProps) {
  const { token } = useAuth();
  const t = useTranslations('backoffice');
  const tCommon = useTranslations('common');
  const { getLabel } = useModelLabels();
  const queryClient = useQueryClient();
  const shelfmarkLabel = getLabel('fieldShelfmark');
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newRepo, setNewRepo] = useState(repositoryId ? String(repositoryId) : '');
  const [newShelfmark, setNewShelfmark] = useState('');
  // The saved label only changes after Save, so remember what was picked here.
  const [picked, setPicked] = useState<{ id: number; label: string } | null>(null);
  const { searchInput, setSearchInput, search } = useDebouncedSearch(300);
  const query = search.trim();
  const typed = searchInput.trim();

  // Until the pause in typing ends, the last results belong to an older search.
  const settled = typed === query;

  const {
    data: currentItemsData,
    isFetching,
    isError,
  } = useQuery({
    queryKey: backofficeKeys.currentItems.list({
      repository: repositoryId,
      search: query,
      limit: SEARCH_LIMIT,
    }),
    queryFn: () =>
      getCurrentItems({ repository: repositoryId, search: query, limit: SEARCH_LIMIT }),
    enabled: !!token && open && query.length > 0,
  });

  const { data: repositoriesData } = useQuery({
    queryKey: backofficeKeys.repositories.all(),
    queryFn: () => getRepositories(),
    enabled: !!token && creating,
  });

  const showResults = settled && query.length > 0;
  // The API returns search hits in no particular order.
  const items: CurrentItemOption[] = showResults
    ? [...(currentItemsData?.results ?? [])].sort((a, b) =>
        itemLabel(a).localeCompare(itemLabel(b), undefined, { numeric: true })
      )
    : [];
  const totalMatches = showResults ? (currentItemsData?.count ?? 0) : 0;
  const repositories: Repository[] = repositoriesData ?? [];

  const displayValue =
    value != null ? (picked?.id === value ? picked.label : (selectedLabel ?? null)) : null;

  // Closing from code skips onOpenChange, so every close goes through here.
  const close = () => {
    setOpen(false);
    setSearchInput('');
  };

  const pick = (item: CurrentItemOption) => {
    setPicked({ id: item.id, label: itemLabel(item) });
    onChange(item.id, item);
  };

  const createMut = useMutation({
    mutationFn: () =>
      createCurrentItem({
        repository: Number(newRepo),
        shelfmark: newShelfmark,
      }),
    onSuccess: (data) => {
      toast.success(t('manuscriptsDetail.volumeCreated'));
      queryClient.invalidateQueries({ queryKey: backofficeKeys.currentItems.all() });
      pick(data);
      setCreating(false);
      setNewShelfmark('');
      close();
    },
    onError: (err) => {
      toast.error(t('manuscriptsDetail.volumeCreateFailed'), {
        description: formatApiError(err),
      });
    },
  });

  return (
    <Popover open={open} onOpenChange={(next) => (next ? setOpen(true) : close())}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            'justify-between font-normal',
            !displayValue && 'text-muted-foreground',
            className
          )}
        >
          <span className="truncate">
            {displayValue ?? t('manuscriptsDetail.selectVolumePlaceholder')}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[340px] p-0" align="start">
        {creating ? (
          <div className="p-3 space-y-3">
            <p className="text-sm font-medium">{t('manuscriptsDetail.newPhysicalVolume')}</p>
            <div className="space-y-2">
              <Select value={newRepo} onValueChange={setNewRepo}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder={t('manuscriptsNew.fieldRepository')} />
                </SelectTrigger>
                <SelectContent>
                  {repositories.map((r) => (
                    <SelectItem key={r.id} value={String(r.id)}>
                      {r.label || r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                value={newShelfmark}
                onChange={(e) => setNewShelfmark(e.target.value)}
                placeholder={t('manuscriptsDetail.shelfmarkWithExamplePlaceholder', {
                  label: shelfmarkLabel,
                })}
                className="h-8 text-sm"
              />
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                className="h-7 text-xs"
                onClick={() => createMut.mutate()}
                disabled={!newRepo || !newShelfmark.trim() || createMut.isPending}
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
          <>
            <Command shouldFilter={false}>
              <CommandInput
                value={searchInput}
                onValueChange={setSearchInput}
                placeholder={t('manuscriptsDetail.searchByLabelPlaceholder', {
                  label: shelfmarkLabel.toLowerCase(),
                })}
              />
              <CommandList>
                <CommandEmpty>
                  {typed.length === 0
                    ? t('msdesc.refPicker.typeToSearch')
                    : !settled || isFetching
                      ? t('msdesc.refPicker.searching')
                      : isError
                        ? t('manuscriptsDetail.volumeSearchFailed')
                        : t('manuscriptsDetail.noVolumesFound')}
                </CommandEmpty>
                {items.length > 0 && (
                  <CommandGroup>
                    {items.map((ci) => (
                      <CommandItem
                        key={ci.id}
                        value={String(ci.id)}
                        onSelect={() => {
                          pick(ci);
                          close();
                        }}
                      >
                        <Check
                          className={cn(
                            'mr-2 h-4 w-4',
                            value === ci.id ? 'opacity-100' : 'opacity-0'
                          )}
                        />
                        <span>{itemLabel(ci)}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
              </CommandList>
            </Command>
            {/* Outside the scrolling list, so it stays in view and no search hides it. */}
            <div className="border-t p-1">
              {totalMatches > items.length && (
                <p className="px-2 pb-1 pt-0.5 text-xs text-muted-foreground">
                  {t('manuscriptsDetail.volumeSearchMore', {
                    shown: items.length,
                    count: totalMatches,
                  })}
                </p>
              )}
              <Button
                type="button"
                variant="ghost"
                className="h-8 w-full justify-start px-2 font-normal text-primary"
                onClick={() => {
                  setNewShelfmark(typed);
                  setCreating(true);
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                <span className="truncate">
                  {typed
                    ? t('manuscriptsDetail.createVolumeNamed', { name: typed })
                    : t('manuscriptsDetail.createNewVolume')}
                </span>
              </Button>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
