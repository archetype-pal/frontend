'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { FolderOpen, Loader2, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ImageUploadZone } from '@/components/backoffice/common/image-upload-zone';
import { ConfirmDialog } from '@/components/backoffice/common/confirm-dialog';
import { CarouselImagePickerDialog } from '@/components/backoffice/carousel/carousel-image-picker-dialog';
import { getCarouselImageUrl, getCarouselPickerStartPath } from '@/utils/api';
import type { CarouselItem } from '@/types/backoffice';
import { Input } from '@/components/ui/input';

interface CarouselEditorPanelProps {
  /** The item being edited, or null for "create new" mode. */
  item: CarouselItem | null;
  /** Whether a save mutation is in progress. */
  saving: boolean;
  /** Whether a delete mutation is in progress. */
  deleting: boolean;
  onSave: (data: { title: string; url: string; image?: File | string }) => void;
  onDelete: () => void;
  onCancel: () => void;
}

export function CarouselEditorPanel({
  item,
  saving,
  deleting,
  onSave,
  onDelete,
  onCancel,
}: CarouselEditorPanelProps) {
  const t = useTranslations('backoffice');
  const isNew = !item;

  const [title, setTitle] = useState(item?.title ?? '');
  const [url, setUrl] = useState(item?.url ?? '');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePath, setImagePath] = useState(item?.image ?? '');
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  // Reset form when the selected item changes
  useEffect(() => {
    setTitle(item?.title ?? ''); // eslint-disable-line react-hooks/set-state-in-effect
    setUrl(item?.url ?? '');
    setImagePath(item?.image ?? '');
    setImageFile(null);
  }, [item]);

  const isDirty =
    isNew ||
    title !== (item?.title ?? '') ||
    url !== (item?.url ?? '') ||
    imagePath !== (item?.image ?? '') ||
    imageFile !== null;

  const hasImageValue = imageFile !== null || imagePath.trim().length > 0;
  const canSave = title.trim().length > 0 && hasImageValue && isDirty && !saving;

  const handleSave = useCallback(() => {
    if (!canSave) return;
    onSave({
      title: title.trim(),
      url: url.trim(),
      ...(imageFile ? { image: imageFile } : imagePath.trim() ? { image: imagePath.trim() } : {}),
    });
  }, [canSave, title, url, imageFile, imagePath, onSave]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      // Caps Lock makes `e.key` come through as 'S', so lower-case the
      // letter before comparing — otherwise Cmd/Ctrl+S silently fails to
      // save for caps-locked users.
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSave();
      }
      if (e.key === 'Escape') {
        onCancel();
      }
    },
    [handleSave, onCancel]
  );

  const currentImageUrl = imagePath ? getCarouselImageUrl(imagePath) : null;
  const pickerStartPath = getCarouselPickerStartPath(imagePath);

  return (
    <div className="space-y-5" onKeyDown={handleKeyDown}>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">
          {isNew ? t('carousel.newItemTitle') : t('carousel.editItemTitle')}
        </h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onCancel}>
            {t('carousel.cancelButton')}
          </Button>
          <Button size="sm" onClick={handleSave} disabled={!canSave}>
            {saving && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
            {isNew ? t('carousel.createButton') : t('carousel.saveButton')}
          </Button>
        </div>
      </div>

      <div>
        <Label className="mb-2 block">{t('carousel.imageLabel')}</Label>
        <ImageUploadZone
          key={item?.id ?? 'new'}
          currentImageUrl={currentImageUrl}
          onFileSelect={(file) => setImageFile(file)}
          onClear={() => setImageFile(null)}
          loading={saving}
        />
        <div className="mt-2 flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setPickerOpen(true)}
            disabled={saving}
          >
            <FolderOpen className="h-3.5 w-3.5 mr-1.5" />
            {t('carousel.pickFromMediaButton')}
          </Button>
          {imagePath && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setImagePath('')}
              disabled={saving}
            >
              <X className="h-3.5 w-3.5 mr-1.5" />
              {t('carousel.clearImageButton')}
            </Button>
          )}
        </div>
        <p className="mt-1.5 text-xs text-muted-foreground break-all">
          {imageFile
            ? t('carousel.uploadSelectedHint')
            : imagePath
              ? t('carousel.usingMediaImageHint', { path: imagePath })
              : t('carousel.noImageSelectedHint')}
        </p>
        {isNew && !hasImageValue && (
          <p className="mt-1.5 text-xs text-amber-600">{t('carousel.uploadHint')}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="carousel-title">{t('carousel.titleLabel')}</Label>
        <Input
          id="carousel-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t('carousel.titlePlaceholder')}
          disabled={saving}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="carousel-url">{t('carousel.urlLabel')}</Label>
        <Input
          id="carousel-url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder={t('carousel.urlPlaceholder')}
          disabled={saving}
        />
        <p className="text-xs text-muted-foreground">{t('carousel.urlHint')}</p>
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
              {t('carousel.deleteItemButton')}
            </Button>
          </div>

          <ConfirmDialog
            open={confirmDeleteOpen}
            onOpenChange={setConfirmDeleteOpen}
            title={t('carousel.deleteTitle', { title: item.title })}
            description={t('carousel.deleteDesc')}
            confirmLabel={t('carousel.deleteConfirm')}
            loading={deleting}
            onConfirm={onDelete}
          />
        </>
      )}

      <CarouselImagePickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        initialPath={pickerStartPath}
        onSelectImage={(path) => {
          setImagePath(`/media/${path.replace(/^\/+/, '')}`);
          setImageFile(null);
        }}
      />
    </div>
  );
}
