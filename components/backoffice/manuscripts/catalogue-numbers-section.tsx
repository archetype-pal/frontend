'use client'

import { useState } from 'react'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { useAuth } from '@/contexts/auth-context'
import { toast } from 'sonner'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { InlineEdit } from '@/components/backoffice/common/inline-edit'
import { getSources } from '@/services/backoffice/manuscripts'
import {
  createCatalogueNumber,
  updateCatalogueNumber,
  deleteCatalogueNumber,
} from '@/services/backoffice/manuscripts'
import { backofficeKeys } from '@/lib/backoffice/query-keys'
import { formatApiError } from '@/lib/backoffice/format-api-error'
import type { CatalogueNumber } from '@/types/backoffice'

interface CatalogueNumbersSectionProps {
  historicalItemId: number
  catalogueNumbers: CatalogueNumber[]
}

export function CatalogueNumbersSection({
  historicalItemId,
  catalogueNumbers,
}: CatalogueNumbersSectionProps) {
  const { token } = useAuth()
  const queryClient = useQueryClient()
  const [adding, setAdding] = useState(false)
  const [newCatalogue, setNewCatalogue] = useState('')
  const [newNumber, setNewNumber] = useState('')
  const [newUrl, setNewUrl] = useState('')
  const [editingSourceId, setEditingSourceId] = useState<number | null>(null)
  const [editSourceValue, setEditSourceValue] = useState('')

  const { data: sources } = useQuery({
    queryKey: backofficeKeys.sources.all(),
    queryFn: () => getSources(token!),
    enabled: !!token,
  })

  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: backofficeKeys.manuscripts.detail(historicalItemId),
    })

  const createMut = useMutation({
    mutationFn: () =>
      createCatalogueNumber(token!, {
        historical_item: historicalItemId,
        catalogue: Number(newCatalogue),
        number: newNumber,
        url: newUrl || null,
      }),
    onSuccess: () => {
      toast.success('Catalogue number added')
      invalidate()
      setAdding(false)
      setNewCatalogue('')
      setNewNumber('')
      setNewUrl('')
    },
    onError: (err) => {
      toast.error('Failed to add catalogue number', {
        description: formatApiError(err),
      })
    },
  })

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) =>
      updateCatalogueNumber(token!, id, data),
    onSuccess: () => {
      toast.success('Catalogue number updated')
      invalidate()
      setEditingSourceId(null)
    },
    onError: (err) => {
      toast.error('Failed to update catalogue number', {
        description: formatApiError(err),
      })
    },
  })

  const deleteMut = useMutation({
    mutationFn: (id: number) => deleteCatalogueNumber(token!, id),
    onSuccess: () => {
      toast.success('Catalogue number removed')
      invalidate()
    },
    onError: (err) => {
      toast.error('Failed to remove catalogue number', {
        description: formatApiError(err),
      })
    },
  })

  return (
    <div className='space-y-3'>
      <div className='flex items-center justify-between'>
        <h3 className='text-sm font-medium'>Catalogue Numbers</h3>
        <Button
          variant='outline'
          size='sm'
          className='h-7 gap-1 text-xs'
          onClick={() => setAdding(true)}
        >
          <Plus className='h-3 w-3' />
          Add
        </Button>
      </div>

      {catalogueNumbers.length === 0 && !adding ? (
        <p className='text-sm text-muted-foreground py-2'>
          No catalogue numbers
        </p>
      ) : (
        <div className='rounded-md border divide-y'>
          {catalogueNumbers.map((cn) => (
            <div
              key={cn.id}
              className='flex items-center gap-3 px-3 py-2 text-sm'
            >
              {/* Catalogue source – click-to-edit dropdown */}
              <div className='w-28 shrink-0'>
                {editingSourceId === cn.id ? (
                  <Select
                    value={editSourceValue}
                    onValueChange={(val) => {
                      setEditSourceValue(val)
                      updateMut.mutate({
                        id: cn.id,
                        data: { catalogue: Number(val) },
                      })
                    }}
                  >
                    <SelectTrigger className='h-7 text-xs'>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(sources ?? []).map((s) => (
                        <SelectItem key={s.id} value={String(s.id)}>
                          {s.label || s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <button
                    type='button'
                    className='group inline-flex items-center gap-1 rounded px-1 py-0.5 text-xs font-medium text-muted-foreground hover:bg-accent transition-colors'
                    onClick={() => {
                      setEditingSourceId(cn.id)
                      setEditSourceValue(String(cn.catalogue))
                    }}
                  >
                    {cn.catalogue_label}
                  </button>
                )}
              </div>

              {/* Number – inline edit */}
              <div className='flex-1'>
                <InlineEdit
                  value={cn.number}
                  onSave={(number) =>
                    updateMut.mutateAsync({ id: cn.id, data: { number } })
                  }
                />
              </div>

              {/* URL – inline edit */}
              <div className='flex-1 max-w-48'>
                <InlineEdit
                  value={cn.url ?? ''}
                  placeholder='Add URL...'
                  onSave={(url) =>
                    updateMut.mutateAsync({
                      id: cn.id,
                      data: { url: url || null },
                    })
                  }
                  renderValue={(v) =>
                    v ? (
                      <span className='text-xs text-primary truncate'>
                        {v}
                      </span>
                    ) : undefined
                  }
                />
              </div>

              <Button
                variant='ghost'
                size='icon'
                className='h-6 w-6 text-muted-foreground hover:text-destructive'
                onClick={() => deleteMut.mutate(cn.id)}
              >
                <Trash2 className='h-3 w-3' />
              </Button>
            </div>
          ))}

          {adding && (
            <div className='flex items-end gap-2 p-3'>
              <div className='w-32'>
                <Select
                  value={newCatalogue}
                  onValueChange={setNewCatalogue}
                >
                  <SelectTrigger className='h-8 text-sm'>
                    <SelectValue placeholder='Source' />
                  </SelectTrigger>
                  <SelectContent>
                    {(sources ?? []).map((s) => (
                      <SelectItem key={s.id} value={String(s.id)}>
                        {s.label || s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Input
                value={newNumber}
                onChange={(e) => setNewNumber(e.target.value)}
                placeholder='Number'
                className='h-8 text-sm flex-1'
              />
              <Input
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                placeholder='URL (optional)'
                className='h-8 text-sm flex-1'
              />
              <Button
                size='sm'
                className='h-8'
                onClick={() => createMut.mutate()}
                disabled={!newCatalogue || !newNumber || createMut.isPending}
              >
                Save
              </Button>
              <Button
                variant='outline'
                size='sm'
                className='h-8'
                onClick={() => setAdding(false)}
              >
                Cancel
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
