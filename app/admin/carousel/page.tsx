'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/auth-context'
import {
  Image as ImageIcon,
  Plus,
  Trash2,
  GripVertical,
  ArrowUp,
  ArrowDown,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { InlineEdit } from '@/components/admin/common/inline-edit'
import { ConfirmDialog } from '@/components/admin/common/confirm-dialog'
import {
  getCarouselItems,
  createCarouselItem,
  updateCarouselItem,
  deleteCarouselItem,
} from '@/services/admin/publications'
import type { CarouselItemAdmin } from '@/types/admin'

export default function CarouselPage() {
  const { token } = useAuth()
  const queryClient = useQueryClient()
  const [addOpen, setAddOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<CarouselItemAdmin | null>(null)
  const [newTitle, setNewTitle] = useState('')
  const [newUrl, setNewUrl] = useState('')

  const { data: items } = useQuery({
    queryKey: ['admin', 'carousel'],
    queryFn: () => getCarouselItems(token!),
    enabled: !!token,
  })

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['admin', 'carousel'] })

  const createMut = useMutation({
    mutationFn: () =>
      createCarouselItem(token!, {
        title: newTitle,
        url: newUrl,
        ordering: (items?.length ?? 0) + 1,
      }),
    onSuccess: () => {
      invalidate()
      setAddOpen(false)
      setNewTitle('')
      setNewUrl('')
    },
  })

  const updateMut = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number
      data: Partial<CarouselItemAdmin>
    }) => updateCarouselItem(token!, id, data),
    onSuccess: invalidate,
  })

  const deleteMut = useMutation({
    mutationFn: (id: number) => deleteCarouselItem(token!, id),
    onSuccess: () => {
      invalidate()
      setDeleteTarget(null)
    },
  })

  const moveItem = (index: number, direction: 'up' | 'down') => {
    if (!items) return
    const sorted = [...items].sort((a, b) => a.ordering - b.ordering)
    const swapIdx = direction === 'up' ? index - 1 : index + 1
    if (swapIdx < 0 || swapIdx >= sorted.length) return

    const a = sorted[index]
    const b = sorted[swapIdx]
    // Swap ordering values
    updateMut.mutate({ id: a.id, data: { ordering: b.ordering } })
    updateMut.mutate({ id: b.id, data: { ordering: a.ordering } })
  }

  const sorted = [...(items ?? [])].sort((a, b) => a.ordering - b.ordering)

  return (
    <div className='space-y-4'>
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-3'>
          <ImageIcon className='h-6 w-6 text-primary' />
          <div>
            <h1 className='text-2xl font-semibold tracking-tight'>
              Carousel
            </h1>
            <p className='text-sm text-muted-foreground'>
              {sorted.length} items — use arrows to reorder
            </p>
          </div>
        </div>
        <Button size='sm' onClick={() => setAddOpen(true)}>
          <Plus className='h-4 w-4 mr-1' />
          Add Item
        </Button>
      </div>

      {sorted.length === 0 ? (
        <div className='rounded-lg border border-dashed p-8 text-center text-muted-foreground'>
          <p className='text-sm'>No carousel items yet.</p>
        </div>
      ) : (
        <div className='space-y-1'>
          {sorted.map((item, idx) => (
            <div
              key={item.id}
              className='flex items-center gap-3 rounded-lg border bg-card p-3'
            >
              <GripVertical className='h-4 w-4 text-muted-foreground/50 shrink-0' />

              <div className='flex flex-col gap-0.5'>
                <Button
                  variant='ghost'
                  size='icon'
                  className='h-5 w-5'
                  disabled={idx === 0}
                  onClick={() => moveItem(idx, 'up')}
                >
                  <ArrowUp className='h-3 w-3' />
                </Button>
                <Button
                  variant='ghost'
                  size='icon'
                  className='h-5 w-5'
                  disabled={idx === sorted.length - 1}
                  onClick={() => moveItem(idx, 'down')}
                >
                  <ArrowDown className='h-3 w-3' />
                </Button>
              </div>

              <div className='h-16 w-24 shrink-0 rounded bg-muted flex items-center justify-center'>
                <ImageIcon className='h-6 w-6 text-muted-foreground/50' />
              </div>

              <div className='flex-1 min-w-0 space-y-1'>
                <InlineEdit
                  value={item.title}
                  onSave={(title) =>
                    updateMut.mutate({ id: item.id, data: { title } })
                  }
                  className='font-medium'
                />
                <InlineEdit
                  value={item.url}
                  onSave={(url) =>
                    updateMut.mutate({ id: item.id, data: { url } })
                  }
                  className='text-xs text-muted-foreground'
                  placeholder='Set URL...'
                />
              </div>

              <span className='text-xs text-muted-foreground tabular-nums w-6 text-center'>
                #{item.ordering}
              </span>

              <Button
                variant='ghost'
                size='icon'
                className='h-7 w-7 text-muted-foreground hover:text-destructive'
                onClick={() => setDeleteTarget(item)}
              >
                <Trash2 className='h-3.5 w-3.5' />
              </Button>
            </div>
          ))}
        </div>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className='max-w-sm'>
          <DialogHeader>
            <DialogTitle>New Carousel Item</DialogTitle>
          </DialogHeader>
          <div className='space-y-3 mt-2'>
            <div className='space-y-1.5'>
              <Label>Title</Label>
              <Input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder='Carousel item title'
              />
            </div>
            <div className='space-y-1.5'>
              <Label>URL</Label>
              <Input
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                placeholder='/about or https://...'
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => createMut.mutate()}
              disabled={!newTitle.trim() || createMut.isPending}
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={`Delete "${deleteTarget?.title}"?`}
        description='This carousel item will be removed.'
        confirmLabel='Delete'
        loading={deleteMut.isPending}
        onConfirm={() => deleteTarget && deleteMut.mutate(deleteTarget.id)}
      />
    </div>
  )
}
