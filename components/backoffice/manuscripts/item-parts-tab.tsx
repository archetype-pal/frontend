'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/auth-context'
import { toast } from 'sonner'
import {
  ChevronDown,
  Image as ImageIcon,
  ImageOff,
  Plus,
  Trash2,
  Save,
  Loader2,
} from 'lucide-react'
import Image from 'next/image'
import { getIiifImageUrl } from '@/utils/iiif'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { ConfirmDialog } from '@/components/backoffice/common/confirm-dialog'
import { FieldLabel } from '@/components/backoffice/common/help-tooltip'
import { CurrentItemCombobox } from './current-item-combobox'
import {
  createItemPart,
  updateItemPart,
  deleteItemPart,
} from '@/services/backoffice/manuscripts'
import { backofficeKeys } from '@/lib/backoffice/query-keys'
import { formatApiError } from '@/lib/backoffice/format-api-error'
import type { ItemPartNested } from '@/types/backoffice'

interface ItemPartsTabProps {
  historicalItemId: number
  itemParts: ItemPartNested[]
}

export function ItemPartsTab({
  historicalItemId,
  itemParts,
}: ItemPartsTabProps) {
  const { token } = useAuth()
  const queryClient = useQueryClient()

  const createMut = useMutation({
    mutationFn: () =>
      createItemPart(token!, { historical_item: historicalItemId }),
    onSuccess: () => {
      toast.success('Part added')
      queryClient.invalidateQueries({
        queryKey: backofficeKeys.manuscripts.detail(historicalItemId),
      })
    },
    onError: (err) => {
      toast.error('Failed to add part', {
        description: formatApiError(err),
      })
    },
  })

  return (
    <div className='space-y-3'>
      <div className='flex items-center justify-between'>
        <h3 className='text-sm font-medium'>
          Parts ({itemParts.length})
        </h3>
        <Button
          variant='outline'
          size='sm'
          className='h-7 gap-1 text-xs'
          onClick={() => createMut.mutate()}
          disabled={createMut.isPending}
        >
          {createMut.isPending ? (
            <Loader2 className='h-3 w-3 animate-spin' />
          ) : (
            <Plus className='h-3 w-3' />
          )}
          Add Part
        </Button>
      </div>

      {itemParts.length === 0 ? (
        <div className='rounded-lg border border-dashed p-8 text-center text-muted-foreground'>
          <p className='text-sm'>No parts yet. Add a part to link this manuscript to a physical volume.</p>
        </div>
      ) : (
        <div className='space-y-2'>
          {itemParts.map((part) => (
            <ItemPartCard
              key={part.id}
              part={part}
              historicalItemId={historicalItemId}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function ItemPartCard({
  part,
  historicalItemId,
}: {
  part: ItemPartNested
  historicalItemId: number
}) {
  const { token } = useAuth()
  const queryClient = useQueryClient()

  const [currentItemId, setCurrentItemId] = useState<number | null>(
    part.current_item
  )
  const [locus, setLocus] = useState(part.current_item_locus)
  const [customLabel, setCustomLabel] = useState(part.custom_label)
  const [dirty, setDirty] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: backofficeKeys.manuscripts.detail(historicalItemId),
    })

  const saveMut = useMutation({
    mutationFn: () =>
      updateItemPart(token!, part.id, {
        current_item: currentItemId,
        current_item_locus: locus,
        custom_label: customLabel,
      }),
    onSuccess: () => {
      toast.success('Part updated')
      invalidate()
      setDirty(false)
    },
    onError: (err) => {
      toast.error('Failed to update part', {
        description: formatApiError(err),
      })
    },
  })

  const deleteMut = useMutation({
    mutationFn: () => deleteItemPart(token!, part.id),
    onSuccess: () => {
      toast.success('Part removed')
      invalidate()
    },
    onError: (err) => {
      toast.error('Failed to remove part', {
        description: formatApiError(err),
      })
    },
  })

  return (
    <Collapsible className='rounded-md border'>
      <CollapsibleTrigger className='flex w-full items-center gap-3 px-4 py-3 hover:bg-accent/30 transition-colors'>
        <ChevronDown className='h-4 w-4 shrink-0 transition-transform [[data-state=closed]>&]:rotate-[-90deg]' />
        <div className='flex-1 text-left'>
          <p className='text-sm font-medium'>{part.display_label}</p>
          {part.current_item_display && (
            <p className='text-xs text-muted-foreground'>
              {part.current_item_display}
              {part.current_item_locus ? `, ${part.current_item_locus}` : ''}
            </p>
          )}
        </div>
        <div className='flex items-center gap-2'>
          {dirty && (
            <Badge variant='default' className='text-[10px] h-5 px-1.5'>
              unsaved
            </Badge>
          )}
          <Badge variant='secondary' className='text-xs gap-1'>
            <ImageIcon className='h-3 w-3' />
            {part.images.length}
          </Badge>
        </div>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className='border-t px-4 py-4 space-y-4'>
          {/* Location fields */}
          <div className='grid grid-cols-1 sm:grid-cols-3 gap-3'>
            <div className='space-y-1.5 sm:col-span-2'>
              <FieldLabel helpField='itemPart.currentItem'>
                Physical volume
              </FieldLabel>
              <CurrentItemCombobox
                value={currentItemId}
                onChange={(id) => {
                  setCurrentItemId(id)
                  setDirty(true)
                }}
                className='w-full'
              />
            </div>
            <div className='space-y-1.5'>
              <FieldLabel helpField='itemPart.locus'>Locus</FieldLabel>
              <Input
                value={locus}
                onChange={(e) => {
                  setLocus(e.target.value)
                  setDirty(true)
                }}
                placeholder='e.g. f.1r'
                className='h-9'
              />
            </div>
          </div>

          <div className='space-y-1.5'>
            <FieldLabel helpField='itemPart.customLabel'>
              Custom label
            </FieldLabel>
            <Input
              value={customLabel}
              onChange={(e) => {
                setCustomLabel(e.target.value)
                setDirty(true)
              }}
              placeholder='Optional override for display name'
              className='h-9'
            />
          </div>

          {/* Images */}
          {part.images.length > 0 && (
            <div>
              <p className='text-xs font-medium text-muted-foreground mb-2'>
                Images ({part.images.length})
              </p>
              <div className='grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2'>
                {part.images.map((img) => {
                  const thumbUrl = img.image
                    ? getIiifImageUrl(img.image, { thumbnail: true })
                    : null
                  return (
                    <div
                      key={img.id}
                      className='group relative aspect-square rounded-md border bg-muted overflow-hidden'
                    >
                      {thumbUrl ? (
                        <Image
                          src={thumbUrl}
                          alt={img.locus || `Image ${img.id}`}
                          fill
                          className='object-cover'
                          sizes='80px'
                        />
                      ) : (
                        <div className='flex items-center justify-center h-full text-xs text-muted-foreground'>
                          <ImageOff className='h-5 w-5' />
                        </div>
                      )}
                      <div className='absolute bottom-0 inset-x-0 bg-black/60 px-1 py-0.5 z-10'>
                        <p className='text-[9px] text-white truncate'>
                          {img.locus || '—'}
                        </p>
                      </div>
                      {img.text_count > 0 && (
                        <Badge className='absolute top-0.5 right-0.5 h-4 px-1 text-[9px] z-10'>
                          {img.text_count}T
                        </Badge>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className='flex items-center gap-2 pt-1'>
            <Button
              size='sm'
              className='h-7 text-xs gap-1'
              onClick={() => saveMut.mutate()}
              disabled={!dirty || saveMut.isPending}
            >
              {saveMut.isPending ? (
                <Loader2 className='h-3 w-3 animate-spin' />
              ) : (
                <Save className='h-3 w-3' />
              )}
              Save Part
            </Button>
            <Button
              variant='outline'
              size='sm'
              className='h-7 text-xs gap-1 text-destructive hover:text-destructive'
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 className='h-3 w-3' />
              Delete
            </Button>
          </div>
        </div>
      </CollapsibleContent>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title='Delete this part?'
        description='This will remove this part and unlink it from the manuscript. Images attached to this part will also be removed.'
        confirmLabel='Delete'
        loading={deleteMut.isPending}
        onConfirm={() => deleteMut.mutate()}
      />
    </Collapsible>
  )
}
