'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { Loader2, Trash2 } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { IiifThumbnail } from '@/components/backoffice/common/iiif-thumbnail';
import { ConfirmDialog } from '@/components/backoffice/common/confirm-dialog';
import { updateItemImage, deleteItemImage } from '@/services/backoffice/manuscripts';
import { backofficeKeys } from '@/lib/backoffice/query-keys';
import { formatApiError } from '@/lib/backoffice/format-api-error';
import type { ItemPartImage } from '@/types/backoffice';

interface ItemImageEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  image: ItemPartImage;
  historicalItemId: number;
}

export function ItemImageEditDialog({
  open,
  onOpenChange,
  image,
  historicalItemId,
}: ItemImageEditDialogProps) {
  const { token } = useAuth();
  const t = useTranslations('backoffice');
  const tCommon = useTranslations('common');
  const queryClient = useQueryClient();

  const [locus, setLocus] = useState(image.locus);
  const [tags, setTags] = useState((image.tags ?? []).join(', '));
  const [deleteOpen, setDeleteOpen] = useState(false);

  useEffect(() => {
    if (open) {
      setLocus(image.locus); // eslint-disable-line react-hooks/set-state-in-effect
      setTags((image.tags ?? []).join(', '));
    }
  }, [open, image.id, image.locus, image.tags]);

  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: backofficeKeys.manuscripts.detail(historicalItemId),
    });

  const saveMut = useMutation({
    mutationFn: () =>
      updateItemImage(token!, image.id, {
        locus,
        tags: tags
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean),
      }),
    onSuccess: () => {
      toast.success(t('manuscriptsDetail.imageUpdated'));
      invalidate();
      onOpenChange(false);
    },
    onError: (err) => {
      toast.error(t('manuscriptsDetail.imageUpdateFailed'), { description: formatApiError(err) });
    },
  });

  const deleteMut = useMutation({
    mutationFn: () => deleteItemImage(token!, image.id),
    onSuccess: () => {
      toast.success(t('manuscriptsDetail.imageRemoved'));
      invalidate();
      setDeleteOpen(false);
      onOpenChange(false);
    },
    onError: (err) => {
      toast.error(t('manuscriptsDetail.imageRemoveFailed'), { description: formatApiError(err) });
    },
  });

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('manuscriptsDetail.editImage')}</DialogTitle>
            <DialogDescription>{t('manuscriptsDetail.editImageDescription')}</DialogDescription>
          </DialogHeader>

          <div className="px-5 py-4 space-y-5">
            <div className="flex items-start gap-4">
              <div className="w-28 shrink-0">
                <IiifThumbnail image={image.image} locus={locus} />
              </div>
              <div className="flex-1 space-y-2">
                <Label className="text-xs">{t('manuscriptsDetail.iiifImagePath')}</Label>
                <Input
                  readOnly
                  value={image.image ?? ''}
                  className="h-9 font-mono text-xs bg-muted text-muted-foreground"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor={`locus-${image.id}`} className="text-xs">
                {t('manuscriptsNew.fieldLocus')}
              </Label>
              <Input
                id={`locus-${image.id}`}
                value={locus}
                onChange={(e) => setLocus(e.target.value)}
                placeholder={t('manuscriptsNew.locusPlaceholder')}
                className="h-9"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor={`tags-${image.id}`} className="text-xs">
                {t('manuscriptsDetail.tags')}
              </Label>
              <Input
                id={`tags-${image.id}`}
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder={t('manuscriptsDetail.tagsPlaceholder')}
                className="h-9"
              />
            </div>
          </div>

          <DialogFooter className="border-t pt-3 sm:justify-between">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1 text-destructive hover:text-destructive"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 className="h-3 w-3" />
              {tCommon('delete')}
            </Button>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={() => onOpenChange(false)}
              >
                {tCommon('cancel')}
              </Button>
              <Button
                type="button"
                size="sm"
                className="h-8 text-xs gap-1"
                onClick={() => saveMut.mutate()}
                disabled={saveMut.isPending}
              >
                {saveMut.isPending && <Loader2 className="h-3 w-3 animate-spin" />}
                {tCommon('save')}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={t('manuscriptsDetail.deleteImageConfirmTitle')}
        description={t('manuscriptsDetail.deleteImageConfirmDescription')}
        confirmLabel={tCommon('delete')}
        loading={deleteMut.isPending}
        onConfirm={() => deleteMut.mutate()}
      />
    </>
  );
}
