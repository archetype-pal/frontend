'use client'

import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/auth-context'
import { toast } from 'sonner'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  Image as ImageIcon,
  Plus,
  Trash2,
  GripVertical,
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
import { InlineEdit } from '@/components/backoffice/common/inline-edit'
import { ConfirmDialog } from '@/components/backoffice/common/confirm-dialog'
import {
  getCarouselItems,
  createCarouselItem,
  updateCarouselItem,
  deleteCarouselItem,
} from '@/services/backoffice/publications'
import { backofficeKeys } from '@/lib/backoffice/query-keys'
import { formatApiError } from '@/lib/backoffice/format-api-error'
import type { CarouselItem } from '@/types/backoffice'

function SortableCarouselItem({
  item,
  onUpdate,
  onDelete,
}: {
  item: CarouselItem
  onUpdate: (id: number, data: Partial<CarouselItem>) => void
  onDelete: (item: CarouselItem) => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : undefined,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className='flex items-center gap-3 rounded-lg border bg-card p-3'
    >
      <button
        {...attributes}
        {...listeners}
        className='cursor-grab active:cursor-grabbing touch-none'
        aria-label='Drag to reorder'
      >
        <GripVertical className='h-4 w-4 text-muted-foreground shrink-0' />
      </button>

      <div className='h-16 w-24 shrink-0 rounded bg-muted flex items-center justify-center'>
        <ImageIcon className='h-6 w-6 text-muted-foreground' />
      </div>

      <div className='flex-1 min-w-0 space-y-1'>
        <InlineEdit
          value={item.title}
          onSave={(title) => onUpdate(item.id, { title })}
          className='font-medium'
        />
        <InlineEdit
          value={item.url}
          onSave={(url) => onUpdate(item.id, { url })}
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
        onClick={() => onDelete(item)}
      >
        <Trash2 className='h-3.5 w-3.5' />
      </Button>
    </div>
  )
}

export default function CarouselPage() {
  const { token } = useAuth()
  const queryClient = useQueryClient()
  const [addOpen, setAddOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<CarouselItem | null>(null)
  const [newTitle, setNewTitle] = useState('')
  const [newUrl, setNewUrl] = useState('')

  const { data: items } = useQuery({
    queryKey: backofficeKeys.carousel.all(),
    queryFn: () => getCarouselItems(token!),
    enabled: !!token,
  })

  const invalidate = useCallback(
    () => queryClient.invalidateQueries({ queryKey: backofficeKeys.carousel.all() }),
    [queryClient]
  )

  const createMut = useMutation({
    mutationFn: () =>
      createCarouselItem(token!, {
        title: newTitle,
        url: newUrl,
        ordering: (items?.length ?? 0) + 1,
      }),
    onSuccess: () => {
      toast.success('Carousel item created')
      invalidate()
      setAddOpen(false)
      setNewTitle('')
      setNewUrl('')
    },
    onError: (err) => {
      toast.error('Failed to create carousel item', {
        description: formatApiError(err),
      })
    },
  })

  const updateMut = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number
      data: Partial<CarouselItem>
    }) => updateCarouselItem(token!, id, data),
    onSuccess: invalidate,
    onError: (err) => {
      toast.error('Failed to update carousel item', {
        description: formatApiError(err),
      })
    },
  })

  const deleteMut = useMutation({
    mutationFn: (id: number) => deleteCarouselItem(token!, id),
    onSuccess: () => {
      toast.success('Carousel item deleted')
      invalidate()
      setDeleteTarget(null)
    },
    onError: (err) => {
      toast.error('Failed to delete carousel item', {
        description: formatApiError(err),
      })
    },
  })

  const sorted = [...(items ?? [])].sort((a, b) => a.ordering - b.ordering)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      if (!over || active.id === over.id || !items) return

      const currentSorted = [...items].sort((a, b) => a.ordering - b.ordering)
      const oldIndex = currentSorted.findIndex((item) => item.id === active.id)
      const newIndex = currentSorted.findIndex((item) => item.id === over.id)

      if (oldIndex === -1 || newIndex === -1) return

      // Compute new ordering for all affected items
      const reordered = [...currentSorted]
      const [movedItem] = reordered.splice(oldIndex, 1)
      reordered.splice(newIndex, 0, movedItem)

      // Optimistically update cache
      const updated = reordered.map((item, i) => ({
        ...item,
        ordering: i + 1,
      }))
      queryClient.setQueryData(backofficeKeys.carousel.all(), updated)

      // Persist all ordering changes
      Promise.all(
        updated
          .filter((item, i) => currentSorted[i]?.id !== item.id || currentSorted[i]?.ordering !== item.ordering)
          .map((item) =>
            updateCarouselItem(token!, item.id, { ordering: item.ordering })
          )
      )
        .then(() => invalidate())
        .catch(() => {
          toast.error('Failed to reorder items')
          invalidate()
        })
    },
    [items, token, queryClient, invalidate]
  )

  const handleUpdate = useCallback(
    (id: number, data: Partial<CarouselItem>) => {
      updateMut.mutate({ id, data })
    },
    [updateMut]
  )

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
              {sorted.length} items &mdash; drag to reorder
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
          <ImageIcon className='h-10 w-10 mx-auto mb-3 text-muted-foreground/50' />
          <p className='text-sm font-medium'>No carousel items yet</p>
          <p className='text-xs mt-1'>
            Add your first carousel item to get started.
          </p>
          <Button
            variant='outline'
            size='sm'
            className='mt-3'
            onClick={() => setAddOpen(true)}
          >
            <Plus className='h-3.5 w-3.5 mr-1' />
            Add Item
          </Button>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={sorted.map((item) => item.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className='space-y-1'>
              {sorted.map((item) => (
                <SortableCarouselItem
                  key={item.id}
                  item={item}
                  onUpdate={handleUpdate}
                  onDelete={setDeleteTarget}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
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
