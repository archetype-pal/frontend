'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/auth-context';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import {
  ChevronDown,
  Image as ImageIcon,
  ImagePlus,
  Pencil,
  Plus,
  Trash2,
  Save,
  Loader2,
} from 'lucide-react';
import { IiifThumbnail } from '@/components/backoffice/common/iiif-thumbnail';
import { ItemImageEditDialog } from './item-image-edit-dialog';
import { ItemImageUploadDialog } from './item-image-upload-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ConfirmDialog } from '@/components/backoffice/common/confirm-dialog';
import { FieldLabel } from '@/components/backoffice/common/help-tooltip';
import { CurrentItemCombobox } from './current-item-combobox';
import { createItemPart, updateItemPart, deleteItemPart } from '@/services/backoffice/manuscripts';
import { backofficeKeys } from '@/lib/backoffice/query-keys';
import { formatApiError } from '@/lib/backoffice/format-api-error';
import type { ItemPartImage, ItemPartNested } from '@/types/backoffice';

interface ItemPartsTabProps {
  historicalItemId: number;
  itemParts: ItemPartNested[];
}

export function ItemPartsTab({ historicalItemId, itemParts }: ItemPartsTabProps) {
  const { token } = useAuth();
  const t = useTranslations('backoffice');
  const queryClient = useQueryClient();

  const createMut = useMutation({
    mutationFn: () => createItemPart(token!, { historical_item: historicalItemId }),
    onSuccess: () => {
      toast.success(t('manuscriptsDetail.partAdded'));
      queryClient.invalidateQueries({
        queryKey: backofficeKeys.manuscripts.detail(historicalItemId),
      });
    },
    onError: (err) => {
      toast.error(t('manuscriptsDetail.partAddFailed'), {
        description: formatApiError(err),
      });
    },
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">
          {t('manuscriptsDetail.partsHeading', { count: itemParts.length })}
        </h3>
        <Button
          variant="outline"
          size="sm"
          className="h-7 gap-1 text-xs"
          onClick={() => createMut.mutate()}
          disabled={createMut.isPending}
        >
          {createMut.isPending ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Plus className="h-3 w-3" />
          )}
          {t('manuscriptsDetail.addPart')}
        </Button>
      </div>

      {itemParts.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
          <p className="text-sm">{t('manuscriptsDetail.noPartsYet')}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {itemParts.map((part) => (
            <ItemPartCard key={part.id} part={part} historicalItemId={historicalItemId} />
          ))}
        </div>
      )}
    </div>
  );
}

function ItemPartCard({
  part,
  historicalItemId,
}: {
  part: ItemPartNested;
  historicalItemId: number;
}) {
  const { token } = useAuth();
  const t = useTranslations('backoffice');
  const tCommon = useTranslations('common');
  const queryClient = useQueryClient();

  const [currentItemId, setCurrentItemId] = useState<number | null>(part.current_item);
  const [locus, setLocus] = useState(part.current_item_locus);
  const [customLabel, setCustomLabel] = useState(part.custom_label);
  const [dirty, setDirty] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);

  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: backofficeKeys.manuscripts.detail(historicalItemId),
    });

  const saveMut = useMutation({
    mutationFn: () =>
      updateItemPart(token!, part.id, {
        current_item: currentItemId,
        current_item_locus: locus,
        custom_label: customLabel,
      }),
    onSuccess: () => {
      toast.success(t('manuscriptsDetail.partUpdated'));
      invalidate();
      setDirty(false);
    },
    onError: (err) => {
      toast.error(t('manuscriptsDetail.partUpdateFailed'), {
        description: formatApiError(err),
      });
    },
  });

  const deleteMut = useMutation({
    mutationFn: () => deleteItemPart(token!, part.id),
    onSuccess: () => {
      toast.success(t('manuscriptsDetail.partRemoved'));
      invalidate();
    },
    onError: (err) => {
      toast.error(t('manuscriptsDetail.partRemoveFailed'), {
        description: formatApiError(err),
      });
    },
  });

  return (
    <Collapsible className="rounded-md border">
      <CollapsibleTrigger className="flex w-full items-center gap-3 px-4 py-3 hover:bg-accent/30 transition-colors">
        <ChevronDown className="h-4 w-4 shrink-0 transition-transform [[data-state=closed]>&]:rotate-[-90deg]" />
        <div className="flex-1 text-left">
          <p className="text-sm font-medium">{part.display_label}</p>
          {part.current_item_display && (
            <p className="text-xs text-muted-foreground">
              {part.current_item_display}
              {part.current_item_locus ? `, ${part.current_item_locus}` : ''}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {dirty && (
            <Badge variant="default" className="text-[10px] h-5 px-1.5">
              {t('manuscriptsDetail.unsaved')}
            </Badge>
          )}
          <Badge variant="secondary" className="text-xs gap-1">
            <ImageIcon className="h-3 w-3" />
            {part.images.length}
          </Badge>
        </div>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="border-t px-4 py-4 space-y-4">
          {/* Location fields */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5 sm:col-span-2">
              <FieldLabel helpField="itemPart.currentItem">
                {t('manuscriptsDetail.physicalVolume')}
              </FieldLabel>
              <CurrentItemCombobox
                value={currentItemId}
                onChange={(id) => {
                  setCurrentItemId(id);
                  setDirty(true);
                }}
                selectedLabel={part.current_item_display}
                className="w-full"
              />
            </div>
            <div className="space-y-1.5">
              <FieldLabel helpField="itemPart.locus">{t('manuscriptsNew.fieldLocus')}</FieldLabel>
              <Input
                value={locus}
                onChange={(e) => {
                  setLocus(e.target.value);
                  setDirty(true);
                }}
                placeholder={t('manuscriptsNew.locusPlaceholder')}
                className="h-9"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <FieldLabel helpField="itemPart.customLabel">
              {t('manuscriptsDetail.customLabel')}
            </FieldLabel>
            <Input
              value={customLabel}
              onChange={(e) => {
                setCustomLabel(e.target.value);
                setDirty(true);
              }}
              placeholder={t('manuscriptsDetail.customLabelPlaceholder')}
              className="h-9"
            />
          </div>

          {/* Images */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">
                {t('manuscriptsDetail.imagesHeading', { count: part.images.length })}
              </p>
              <Button
                variant="outline"
                size="sm"
                className="h-7 gap-1 text-xs"
                onClick={() => setUploadOpen(true)}
              >
                <ImagePlus className="h-3 w-3" />
                {t('manuscriptsDetail.addImages')}
              </Button>
            </div>
            {part.images.length > 0 ? (
              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                {part.images.map((img) => (
                  <EditableImageThumbnail
                    key={img.id}
                    image={img}
                    historicalItemId={historicalItemId}
                  />
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">
                {t('manuscriptsDetail.noImagesYet')}
              </p>
            )}
          </div>

          {uploadOpen && (
            <ItemImageUploadDialog
              open={uploadOpen}
              onOpenChange={setUploadOpen}
              itemPartId={part.id}
              itemPartLabel={part.display_label}
              historicalItemId={historicalItemId}
            />
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 pt-1">
            <Button
              size="sm"
              className="h-7 text-xs gap-1"
              onClick={() => saveMut.mutate()}
              disabled={!dirty || saveMut.isPending}
            >
              {saveMut.isPending ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Save className="h-3 w-3" />
              )}
              {t('manuscriptsDetail.savePart')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1 text-destructive hover:text-destructive"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 className="h-3 w-3" />
              {tCommon('delete')}
            </Button>
          </div>
        </div>
      </CollapsibleContent>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={t('manuscriptsDetail.deletePartConfirmTitle')}
        description={t('manuscriptsDetail.deletePartConfirmDescription')}
        confirmLabel={tCommon('delete')}
        loading={deleteMut.isPending}
        onConfirm={() => deleteMut.mutate()}
      />
    </Collapsible>
  );
}

function EditableImageThumbnail({
  image,
  historicalItemId,
}: {
  image: ItemPartImage;
  historicalItemId: number;
}) {
  const t = useTranslations('backoffice');
  const [editOpen, setEditOpen] = useState(false);

  return (
    <>
      <div className="group relative">
        <IiifThumbnail
          image={image.image}
          alt={image.locus || t('manuscriptsDetail.imageAlt', { id: image.id })}
          locus={image.locus}
        >
          {image.text_count > 0 && (
            <Badge className="absolute top-0.5 right-0.5 h-4 px-1 text-[9px] z-10">
              {t('manuscriptsDetail.textCountBadge', { count: image.text_count })}
            </Badge>
          )}
          <button
            type="button"
            onClick={() => setEditOpen(true)}
            aria-label={t('manuscriptsDetail.editImageAria', { name: image.locus || image.id })}
            className="absolute inset-0 z-20 flex items-center justify-center bg-black/50 opacity-0 transition-opacity hover:opacity-100 focus:opacity-100 focus:outline-none"
          >
            <Pencil className="h-4 w-4 text-white" />
          </button>
        </IiifThumbnail>
      </div>
      {editOpen && (
        <ItemImageEditDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          image={image}
          historicalItemId={historicalItemId}
        />
      )}
    </>
  );
}
