'use client'

import { useCallback, useEffect, useState } from 'react'
import { Loader2, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { ImageUploadZone } from '@/components/backoffice/common/image-upload-zone'
import { ConfirmDialog } from '@/components/backoffice/common/confirm-dialog'
import { getCarouselImageUrl } from '@/utils/api'
import type { CarouselItem } from '@/types/backoffice'

interface CarouselEditorPanelProps {
  /** The item being edited, or null for "create new" mode. */
  item: CarouselItem | null
  /** Whether a save mutation is in progress. */
  saving: boolean
  /** Whether a delete mutation is in progress. */
  deleting: boolean
  onSave: (data: { title: string; url: string; image?: File }) => void
  onDelete: () => void
  onCancel: () => void
}

export function CarouselEditorPanel({
  item,
  saving,
  deleting,
  onSave,
  onDelete,
  onCancel,
}: CarouselEditorPanelProps) {
  const isNew = !item

  const [title, setTitle] = useState(item?.title ?? '')
  const [url, setUrl] = useState(item?.url ?? '')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)

  // Reset form when the selected item changes
  useEffect(() => {
    setTitle(item?.title ?? '') // eslint-disable-line react-hooks/set-state-in-effect
    setUrl(item?.url ?? '')
    setImageFile(null)
  }, [item])

  const isDirty =
    isNew ||
    title !== (item?.title ?? '') ||
    url !== (item?.url ?? '') ||
    imageFile !== null

  const canSave = title.trim().length > 0 && isDirty && !saving

  const handleSave = useCallback(() => {
    if (!canSave) return
    onSave({
      title: title.trim(),
      url: url.trim(),
      ...(imageFile ? { image: imageFile } : {}),
    })
  }, [canSave, title, url, imageFile, onSave])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        handleSave()
      }
      if (e.key === 'Escape') {
        onCancel()
      }
    },
    [handleSave, onCancel]
  )

  const currentImageUrl = item?.image
    ? getCarouselImageUrl(item.image)
    : null

  return (
    <div className="space-y-5" onKeyDown={handleKeyDown}>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">
          {isNew ? 'New Carousel Item' : 'Edit Carousel Item'}
        </h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave} disabled={!canSave}>
            {saving && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
            {isNew ? 'Create' : 'Save'}
          </Button>
        </div>
      </div>

      <div>
        <Label className="mb-2 block">Image</Label>
        <ImageUploadZone
          key={item?.id ?? 'new'}
          currentImageUrl={currentImageUrl}
          onFileSelect={setImageFile}
          onClear={() => setImageFile(null)}
          loading={saving}
        />
        {isNew && !imageFile && (
          <p className="mt-1.5 text-xs text-amber-600">
            An image is required for the carousel to display properly.
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="carousel-title">Title</Label>
        <Input
          id="carousel-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Carousel item title"
          disabled={saving}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="carousel-url">URL</Label>
        <Input
          id="carousel-url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="/about or https://..."
          disabled={saving}
        />
        <p className="text-xs text-muted-foreground">
          Full URL or a relative path starting with /
        </p>
      </div>

      {!isNew && (
        <>
          <Separator />
          <div>
            <Button
              variant="outline"
              size="sm"
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => setConfirmDeleteOpen(true)}
            >
              <Trash2 className="h-3.5 w-3.5 mr-1.5" />
              Delete item
            </Button>
          </div>

          <ConfirmDialog
            open={confirmDeleteOpen}
            onOpenChange={setConfirmDeleteOpen}
            title={`Delete "${item.title}"?`}
            description="This carousel item will be permanently removed."
            confirmLabel="Delete"
            loading={deleting}
            onConfirm={onDelete}
          />
        </>
      )}
    </div>
  )
}
