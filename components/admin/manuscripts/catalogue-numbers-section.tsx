'use client'

import { useState } from 'react'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { useAuth } from '@/contexts/auth-context'
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
import { getSources } from '@/services/admin/manuscripts'
import {
  createCatalogueNumber,
  deleteCatalogueNumber,
} from '@/services/admin/manuscripts'
import type { CatalogueNumber } from '@/types/admin'

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

  const { data: sources } = useQuery({
    queryKey: ['admin', 'sources'],
    queryFn: () => getSources(token!),
    enabled: !!token,
  })

  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: ['admin', 'historical-item', historicalItemId],
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
      invalidate()
      setAdding(false)
      setNewCatalogue('')
      setNewNumber('')
      setNewUrl('')
    },
  })

  const deleteMut = useMutation({
    mutationFn: (id: number) => deleteCatalogueNumber(token!, id),
    onSuccess: invalidate,
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
              <span className='font-medium w-24 shrink-0'>
                {cn.catalogue_label}
              </span>
              <span className='flex-1'>{cn.number}</span>
              {cn.url && (
                <a
                  href={cn.url}
                  target='_blank'
                  rel='noopener noreferrer'
                  className='text-xs text-primary hover:underline truncate max-w-40'
                >
                  {cn.url}
                </a>
              )}
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
