'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Check, ChevronsUpDown } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { getAllPublications } from '@/services/backoffice/publications';
import { backofficeKeys } from '@/lib/backoffice/query-keys';

interface PublicationComboboxProps {
  value: number | null;
  onChange: (publicationId: number | null) => void;
  className?: string;
}

export function PublicationCombobox({ value, onChange, className }: PublicationComboboxProps) {
  const { isAuthenticated } = useAuth();
  const t = useTranslations('backoffice');
  const [open, setOpen] = useState(false);

  const { data: publications = [] } = useQuery({
    queryKey: backofficeKeys.publications.options(),
    queryFn: getAllPublications,
    enabled: isAuthenticated && (open || value != null),
  });

  const selected = publications.find((p) => p.id === value);

  const choose = (publicationId: number | null) => {
    onChange(publicationId);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          role="combobox"
          aria-expanded={open}
          aria-label={t('comments.filterPostLabel')}
          className={cn('w-64 justify-between font-normal', className)}
        >
          <span className="truncate">{selected?.title ?? t('comments.filterPostAll')}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[360px] p-0" align="start">
        <Command>
          <CommandInput placeholder={t('comments.filterPostSearch')} />
          <CommandList>
            <CommandEmpty>{t('comments.filterPostNone')}</CommandEmpty>
            <CommandGroup>
              <CommandItem value="__all__" onSelect={() => choose(null)}>
                <Check
                  className={cn('mr-2 h-4 w-4', value == null ? 'opacity-100' : 'opacity-0')}
                />
                {t('comments.filterPostAll')}
              </CommandItem>
              {publications.map((p) => (
                <CommandItem
                  key={p.id}
                  value={String(p.id)}
                  keywords={[p.title]}
                  onSelect={() => choose(p.id)}
                >
                  <Check
                    className={cn('mr-2 h-4 w-4', value === p.id ? 'opacity-100' : 'opacity-0')}
                  />
                  <span className="truncate">{p.title}</span>
                  <span className="ml-auto pl-2 text-xs text-muted-foreground">
                    {p.comment_count}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
