'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { ChevronsUpDown, Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { IiifThumbnail } from '@/components/backoffice/common/iiif-thumbnail';
import { ConfirmDialog } from '@/components/backoffice/common/confirm-dialog';
import { useDebouncedSearch } from '@/hooks/backoffice/use-debounced-search';
import { updateItemImage, deleteItemImage } from '@/services/backoffice/manuscripts';
import { searchItemParts } from '@/services/tei-ref-search';
import { backofficeKeys } from '@/lib/backoffice/query-keys';
import { formatApiError } from '@/lib/backoffice/format-api-error';
import { BackofficeApiError } from '@/services/backoffice/api-client';
import type { ItemPartImage } from '@/types/backoffice';

interface ItemImageEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  image: ItemPartImage;
  historicalItemId: number;
  itemPartId: number;
  itemPartLabel: string;
}

interface PartChoice {
  id: number;
  label: string;
}

export function ItemImageEditDialog({
  open,
  onOpenChange,
  image,
  historicalItemId,
  itemPartId,
  itemPartLabel,
}: ItemImageEditDialogProps) {
  const t = useTranslations('backoffice');
  const tCommon = useTranslations('common');
  const queryClient = useQueryClient();

  const [locus, setLocus] = useState(image.locus);
  const [tags, setTags] = useState((image.tags ?? []).join(', '));
  const [targetPart, setTargetPart] = useState<PartChoice | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const tagsKey = (image.tags ?? []).join(', ');

  useEffect(() => {
    if (open) {
      setLocus(image.locus); // eslint-disable-line react-hooks/set-state-in-effect
      setTags(tagsKey);
      setTargetPart(null);
    }
    // `tagsKey` (not `image.tags`) so an equal-content refetch — which
    // returns a new array reference — doesn't re-trigger this and wipe an
    // in-progress edit; strings compare by value like `image.locus` already does.
  }, [open, image.id, image.locus, tagsKey]);

  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: backofficeKeys.manuscripts.detail(historicalItemId),
    });

  const saveMut = useMutation({
    mutationFn: () =>
      updateItemImage(image.id, {
        locus,
        tags: tags
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean),
        ...(targetPart ? { item_part: targetPart.id } : {}),
      }),
    onSuccess: () => {
      if (targetPart) {
        toast.success(t('manuscriptsDetail.imageMoved', { part: targetPart.label }));
        // The part it joined may belong to another manuscript.
        queryClient.invalidateQueries({ queryKey: backofficeKeys.manuscripts.all() });
        // The hand pages list each part's images, and the picker shows image counts.
        queryClient.invalidateQueries({ queryKey: ['backoffice', 'item-images'] });
        queryClient.invalidateQueries({ queryKey: ['item-part-search'] });
      } else {
        toast.success(t('manuscriptsDetail.imageUpdated'));
        invalidate();
      }
      onOpenChange(false);
    },
    onError: (err) => {
      // A refused move explains itself; the generic formatter would prefix the field name.
      const moveError =
        err instanceof BackofficeApiError && Array.isArray(err.body.item_part)
          ? (err.body.item_part as string[]).join(' ')
          : null;
      toast.error(t('manuscriptsDetail.imageUpdateFailed'), {
        description: moveError ?? formatApiError(err),
      });
    },
  });

  const deleteMut = useMutation({
    mutationFn: () => deleteItemImage(image.id),
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
                  value={image.image_path ?? ''}
                  className="h-9 font-mono text-xs bg-muted text-muted-foreground"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor={`part-${image.id}`} className="text-xs">
                {t('manuscriptsDetail.part')}
              </Label>
              <ItemPartPicker
                id={`part-${image.id}`}
                currentPartId={itemPartId}
                label={targetPart?.label ?? itemPartLabel}
                onPick={setTargetPart}
              />
              {targetPart && (
                <p className="text-xs text-muted-foreground">
                  {t('manuscriptsDetail.moveNotice', { part: targetPart.label })}
                </p>
              )}
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

function ItemPartPicker({
  id,
  currentPartId,
  label,
  onPick,
}: {
  id: string;
  currentPartId: number;
  label: string;
  onPick: (part: PartChoice) => void;
}) {
  const t = useTranslations('backoffice');
  const [open, setOpen] = useState(false);
  const { searchInput, setSearchInput, search } = useDebouncedSearch(300);
  const query = search.trim();
  const { data: hits = [], isFetching } = useQuery({
    queryKey: ['item-part-search', query],
    queryFn: ({ signal }) => searchItemParts(query, 12, signal),
    enabled: open && query.length > 0,
    staleTime: 60_000,
  });
  // Parts can share a label, so each row also shows what tells them apart.
  const options = hits
    .filter((hit) => hit.id !== currentPartId)
    .map((hit) => ({
      id: hit.id,
      label: hit.display_label || `#${hit.id}`,
      detail: [
        `#${hit.id}`,
        t('manuscriptsDetail.partImageCount', { count: hit.number_of_images ?? 0 }),
        hit.date,
      ]
        .filter(Boolean)
        .join(' · '),
    }));

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="h-9 w-full justify-between font-normal"
        >
          <span className="truncate">{label}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[360px] p-0">
        <Command shouldFilter={false}>
          <CommandInput
            value={searchInput}
            onValueChange={setSearchInput}
            placeholder={t('manuscriptsDetail.searchParts')}
          />
          <CommandList>
            <CommandEmpty>
              {query.length === 0
                ? t('msdesc.refPicker.typeToSearch')
                : isFetching
                  ? t('msdesc.refPicker.searching')
                  : t('msdesc.refPicker.noResults')}
            </CommandEmpty>
            {options.length > 0 && (
              <CommandGroup>
                {options.map((option) => (
                  <CommandItem
                    key={option.id}
                    value={String(option.id)}
                    onSelect={() => {
                      onPick({ id: option.id, label: option.label });
                      setOpen(false);
                    }}
                  >
                    <div className="min-w-0">
                      <p className="truncate">{option.label}</p>
                      <p className="text-xs text-muted-foreground">{option.detail}</p>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
