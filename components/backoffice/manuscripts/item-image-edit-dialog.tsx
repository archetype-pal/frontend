'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ImageIcon, Loader2, Trash2 } from 'lucide-react';
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
import { CarouselImagePickerDialog } from '@/components/backoffice/carousel/carousel-image-picker-dialog';
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
  const queryClient = useQueryClient();

  const [locus, setLocus] = useState(image.locus);
  const [imagePath, setImagePath] = useState(image.image ?? '');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  useEffect(() => {
    if (open) {
      setLocus(image.locus); // eslint-disable-line react-hooks/set-state-in-effect
      setImagePath(image.image ?? '');
    }
  }, [open, image.id, image.locus, image.image]);

  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: backofficeKeys.manuscripts.detail(historicalItemId),
    });

  const saveMut = useMutation({
    mutationFn: () =>
      updateItemImage(token!, image.id, {
        locus,
        image: imagePath || null,
      }),
    onSuccess: () => {
      toast.success('Image updated');
      invalidate();
      onOpenChange(false);
    },
    onError: (err) => {
      toast.error('Failed to update image', { description: formatApiError(err) });
    },
  });

  const deleteMut = useMutation({
    mutationFn: () => deleteItemImage(token!, image.id),
    onSuccess: () => {
      toast.success('Image removed');
      invalidate();
      setDeleteOpen(false);
      onOpenChange(false);
    },
    onError: (err) => {
      toast.error('Failed to remove image', { description: formatApiError(err) });
    },
  });

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit image</DialogTitle>
            <DialogDescription>
              Update the locus or replace the underlying IIIF image.
            </DialogDescription>
          </DialogHeader>

          <div className="px-5 py-4 space-y-5">
            <div className="flex items-start gap-4">
              <div className="w-28 shrink-0">
                <IiifThumbnail image={imagePath || null} locus={locus} />
              </div>
              <div className="flex-1 space-y-2">
                <Label className="text-xs">IIIF image path</Label>
                <Input
                  value={imagePath}
                  onChange={(e) => setImagePath(e.target.value)}
                  placeholder="historical_items/..."
                  className="h-9 font-mono text-xs"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 gap-1 text-xs"
                  onClick={() => setPickerOpen(true)}
                >
                  <ImageIcon className="h-3 w-3" />
                  Browse media
                </Button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor={`locus-${image.id}`} className="text-xs">
                Locus
              </Label>
              <Input
                id={`locus-${image.id}`}
                value={locus}
                onChange={(e) => setLocus(e.target.value)}
                placeholder="e.g. f.1r"
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
              Delete
            </Button>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                className="h-8 text-xs gap-1"
                onClick={() => saveMut.mutate()}
                disabled={saveMut.isPending}
              >
                {saveMut.isPending && <Loader2 className="h-3 w-3 animate-spin" />}
                Save
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CarouselImagePickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onSelectImage={(path) => setImagePath(path)}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete this image?"
        description="This will remove the image and any associated texts or annotations."
        confirmLabel="Delete"
        loading={deleteMut.isPending}
        onConfirm={() => deleteMut.mutate()}
      />
    </>
  );
}
