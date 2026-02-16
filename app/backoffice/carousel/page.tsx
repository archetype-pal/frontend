'use client'

import { useState, useCallback, useEffect } from 'react'
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
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { Image as ImageIcon, Plus, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SortableCarouselCard } from '@/components/backoffice/carousel/sortable-carousel-card'
import { CarouselEditorPanel } from '@/components/backoffice/carousel/carousel-editor-panel'
import { CarouselPreview } from '@/components/backoffice/carousel/carousel-preview'
import { ConfirmDialog } from '@/components/backoffice/common/confirm-dialog'
import {
  getCarouselItems,
  createCarouselItem,
  updateCarouselItem,
  updateCarouselItemJson,
  deleteCarouselItem,
} from '@/services/backoffice/publications'
import { backofficeKeys } from '@/lib/backoffice/query-keys'
import { formatApiError } from '@/lib/backoffice/format-api-error'
import type { CarouselItem } from '@/types/backoffice'

type PanelMode =
  | { kind: 'preview' }
  | { kind: 'edit'; item: CarouselItem }
  | { kind: 'create' }

export default function CarouselPage() {
  const { token } = useAuth()
  const queryClient = useQueryClient()

  const [panel, setPanel] = useState<PanelMode>({ kind: 'preview' })
  const [deleteTarget, setDeleteTarget] = useState<CarouselItem | null>(null)

  const { data: items, isLoading, isError, refetch } = useQuery({
    queryKey: backofficeKeys.carousel.all(),
    queryFn: () => getCarouselItems(token!),
    enabled: !!token,
  })

  const invalidate = useCallback(
    () =>
      queryClient.invalidateQueries({
        queryKey: backofficeKeys.carousel.all(),
      }),
    [queryClient]
  )

  const sorted = [...(items ?? [])].sort((a, b) => a.ordering - b.ordering)

  // Keep the editor panel in sync when data refreshes
  useEffect(() => {
    if (panel.kind === 'edit' && items) {
      const fresh = items.find((i) => i.id === panel.item.id)
      if (!fresh) {
        setPanel({ kind: 'preview' })
      }
    }
  }, [items, panel])

  // ── Mutations ──────────────────────────────────────────────────────

  const createMut = useMutation({
    mutationFn: (data: { title: string; url: string; image?: File }) =>
      createCarouselItem(token!, {
        title: data.title,
        url: data.url,
        ordering: (items?.length ?? 0) + 1,
        image: data.image ?? null,
      }),
    onSuccess: () => {
      toast.success('Carousel item created')
      invalidate()
      setPanel({ kind: 'preview' })
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
      data: { title: string; url: string; image?: File }
    }) => updateCarouselItem(token!, id, data),
    onSuccess: (updated) => {
      toast.success('Carousel item updated')
      invalidate()
      setPanel({ kind: 'edit', item: updated })
    },
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
      setPanel({ kind: 'preview' })
      setDeleteTarget(null)
    },
    onError: (err) => {
      toast.error('Failed to delete carousel item', {
        description: formatApiError(err),
      })
    },
  })

  // ── Drag-and-drop reordering ───────────────────────────────────────

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
      const oldIndex = currentSorted.findIndex((i) => i.id === active.id)
      const newIndex = currentSorted.findIndex((i) => i.id === over.id)
      if (oldIndex === -1 || newIndex === -1) return

      const reordered = [...currentSorted]
      const [moved] = reordered.splice(oldIndex, 1)
      reordered.splice(newIndex, 0, moved)

      const updated = reordered.map((item, i) => ({
        ...item,
        ordering: i + 1,
      }))

      // Optimistic cache update
      queryClient.setQueryData(backofficeKeys.carousel.all(), updated)

      Promise.all(
        updated
          .filter(
            (item, i) =>
              currentSorted[i]?.id !== item.id ||
              currentSorted[i]?.ordering !== item.ordering
          )
          .map((item) =>
            updateCarouselItemJson(token!, item.id, {
              ordering: item.ordering,
            })
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

  // ── Keyboard shortcuts ─────────────────────────────────────────────

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && panel.kind !== 'preview') {
        setPanel({ kind: 'preview' })
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [panel.kind])

  // ── Handlers ───────────────────────────────────────────────────────

  const handleSelect = useCallback((item: CarouselItem) => {
    setPanel((prev) =>
      prev.kind === 'edit' && prev.item.id === item.id
        ? { kind: 'preview' }
        : { kind: 'edit', item }
    )
  }, [])

  const handleDelete = useCallback((item: CarouselItem) => {
    setDeleteTarget(item)
  }, [])

  const handleEditorSave = useCallback(
    (data: { title: string; url: string; image?: File }) => {
      if (panel.kind === 'create') {
        createMut.mutate(data)
      } else if (panel.kind === 'edit') {
        updateMut.mutate({ id: panel.item.id, data })
      }
    },
    [panel, createMut, updateMut]
  )

  const handleEditorDelete = useCallback(() => {
    if (panel.kind === 'edit') {
      deleteMut.mutate(panel.item.id)
    }
  }, [panel, deleteMut])

  // ── Loading / error states ─────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <p className="text-sm text-destructive">
          Failed to load carousel items
        </p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          Retry
        </Button>
      </div>
    )
  }

  // ── Empty state ────────────────────────────────────────────────────

  if (sorted.length === 0 && panel.kind !== 'create') {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ImageIcon className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-semibold tracking-tight">Carousel</h1>
          </div>
        </div>
        <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
          <ImageIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground/40" />
          <p className="text-base font-medium">No carousel items yet</p>
          <p className="text-sm mt-1 max-w-sm mx-auto">
            The homepage carousel is empty. Add your first item with an image,
            title, and optional link.
          </p>
          <Button
            size="sm"
            className="mt-4"
            onClick={() => setPanel({ kind: 'create' })}
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Add First Item
          </Button>
        </div>
      </div>
    )
  }

  // ── Main layout ────────────────────────────────────────────────────

  const selectedId = panel.kind === 'edit' ? panel.item.id : null

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ImageIcon className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Carousel</h1>
            <p className="text-sm text-muted-foreground">
              {sorted.length} item{sorted.length !== 1 ? 's' : ''} &mdash; drag
              to reorder, click to edit
            </p>
          </div>
        </div>
        <Button
          size="sm"
          onClick={() => setPanel({ kind: 'create' })}
        >
          <Plus className="h-4 w-4 mr-1.5" />
          Add Item
        </Button>
      </div>

      {/* Split layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Left: sortable card list */}
        <div className="lg:col-span-2 space-y-1">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={sorted.map((i) => i.id)}
              strategy={verticalListSortingStrategy}
            >
              {sorted.map((item) => (
                <SortableCarouselCard
                  key={item.id}
                  item={item}
                  isSelected={item.id === selectedId}
                  onSelect={handleSelect}
                  onDelete={handleDelete}
                />
              ))}
            </SortableContext>
          </DndContext>
        </div>

        {/* Right: context-sensitive panel */}
        <div className="lg:col-span-3">
          <div className="rounded-lg border bg-card p-5">
            {panel.kind === 'preview' && (
              <CarouselPreview items={sorted} />
            )}
            {panel.kind === 'edit' && (
              <CarouselEditorPanel
                item={panel.item}
                saving={updateMut.isPending}
                deleting={deleteMut.isPending}
                onSave={handleEditorSave}
                onDelete={handleEditorDelete}
                onCancel={() => setPanel({ kind: 'preview' })}
              />
            )}
            {panel.kind === 'create' && (
              <CarouselEditorPanel
                item={null}
                saving={createMut.isPending}
                deleting={false}
                onSave={handleEditorSave}
                onDelete={() => {}}
                onCancel={() => setPanel({ kind: 'preview' })}
              />
            )}
          </div>
        </div>
      </div>

      {/* Standalone delete confirmation (triggered from card delete button) */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={`Delete "${deleteTarget?.title}"?`}
        description="This carousel item will be permanently removed."
        confirmLabel="Delete"
        loading={deleteMut.isPending}
        onConfirm={() => deleteTarget && deleteMut.mutate(deleteTarget.id)}
      />
    </div>
  )
}
