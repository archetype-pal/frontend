'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/auth-context'
import { toast } from 'sonner'
import { Check, ChevronsUpDown, Plus, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  getCurrentItems,
  createCurrentItem,
  getRepositories,
} from '@/services/backoffice/manuscripts'
import { backofficeKeys } from '@/lib/backoffice/query-keys'
import { formatApiError } from '@/lib/backoffice/format-api-error'
import type { CurrentItemOption, Repository } from '@/types/backoffice'

interface CurrentItemComboboxProps {
  value: number | null
  onChange: (currentItemId: number | null, currentItem?: CurrentItemOption) => void
  /** Pre-filter by repository (optional). */
  repositoryId?: number
  /** Authoritative display label for the selected value (avoids needing the full list to render). */
  selectedLabel?: string | null
  className?: string
}

export function CurrentItemCombobox({
  value,
  onChange,
  repositoryId,
  selectedLabel,
  className,
}: CurrentItemComboboxProps) {
  const { token } = useAuth()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newRepo, setNewRepo] = useState(repositoryId ? String(repositoryId) : '')
  const [newShelfmark, setNewShelfmark] = useState('')

  const { data: currentItemsData } = useQuery({
    queryKey: backofficeKeys.currentItems.list(
      repositoryId ? { repository: repositoryId } : undefined
    ),
    queryFn: () =>
      getCurrentItems(token!, {
        repository: repositoryId,
        limit: 500,
      }),
    enabled: !!token && open,
  })

  const { data: repositoriesData } = useQuery({
    queryKey: backofficeKeys.repositories.all(),
    queryFn: () => getRepositories(token!),
    enabled: !!token && creating,
  })

  const items: CurrentItemOption[] = currentItemsData?.results ?? []
  const repositories: Repository[] = !repositoriesData ? [] : Array.isArray(repositoriesData) ? repositoriesData : repositoriesData.results

  const selectedItem = items.find((ci) => ci.id === value)
  const displayValue = value != null
    ? selectedLabel ?? (selectedItem ? `${selectedItem.repository_name} ${selectedItem.shelfmark}` : null)
    : null

  const createMut = useMutation({
    mutationFn: () =>
      createCurrentItem(token!, {
        repository: Number(newRepo),
        shelfmark: newShelfmark,
      }),
    onSuccess: (data) => {
      toast.success('Volume created')
      queryClient.invalidateQueries({ queryKey: backofficeKeys.currentItems.all() })
      onChange(data.id, data)
      setCreating(false)
      setNewShelfmark('')
      setOpen(false)
    },
    onError: (err) => {
      toast.error('Failed to create volume', {
        description: formatApiError(err),
      })
    },
  })

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant='outline'
          role='combobox'
          aria-expanded={open}
          className={cn('justify-between font-normal', !displayValue && 'text-muted-foreground', className)}
        >
          <span className='truncate'>
            {displayValue ?? 'Select volume...'}
          </span>
          <ChevronsUpDown className='ml-2 h-4 w-4 shrink-0 opacity-50' />
        </Button>
      </PopoverTrigger>
      <PopoverContent className='w-[340px] p-0' align='start'>
        {creating ? (
          <div className='p-3 space-y-3'>
            <p className='text-sm font-medium'>New physical volume</p>
            <div className='space-y-2'>
              <Select value={newRepo} onValueChange={setNewRepo}>
                <SelectTrigger className='h-8 text-sm'>
                  <SelectValue placeholder='Repository' />
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
                placeholder='Shelfmark (e.g. GD55/1)'
                className='h-8 text-sm'
              />
            </div>
            <div className='flex gap-2'>
              <Button
                size='sm'
                className='h-7 text-xs'
                onClick={() => createMut.mutate()}
                disabled={!newRepo || !newShelfmark.trim() || createMut.isPending}
              >
                {createMut.isPending && (
                  <Loader2 className='h-3 w-3 mr-1 animate-spin' />
                )}
                Create
              </Button>
              <Button
                variant='outline'
                size='sm'
                className='h-7 text-xs'
                onClick={() => setCreating(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <Command>
            <CommandInput placeholder='Search by shelfmark...' />
            <CommandList>
              <CommandEmpty>No volumes found.</CommandEmpty>
              <CommandGroup>
                {items.map((ci) => {
                  const label = `${ci.repository_name} ${ci.shelfmark}`
                  return (
                    <CommandItem
                      key={ci.id}
                      value={label}
                      onSelect={() => {
                        onChange(ci.id, ci)
                        setOpen(false)
                      }}
                    >
                      <Check
                        className={cn(
                          'mr-2 h-4 w-4',
                          value === ci.id ? 'opacity-100' : 'opacity-0'
                        )}
                      />
                      <span>{label}</span>
                    </CommandItem>
                  )
                })}
              </CommandGroup>
              <CommandSeparator />
              <CommandGroup>
                <CommandItem
                  onSelect={() => setCreating(true)}
                  className='text-primary'
                >
                  <Plus className='mr-2 h-4 w-4' />
                  Create new volume...
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        )}
      </PopoverContent>
    </Popover>
  )
}
