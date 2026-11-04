'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import {
  ChevronDown,
  ExternalLink,
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
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ConfirmDialog } from '@/components/backoffice/common/confirm-dialog';
import { PartLocationFields, usePartLocation } from './part-location-fields';
import { ItemPartHandsSection } from './item-part-hands-section';
import { createItemPart, deleteItemPart } from '@/services/backoffice/manuscripts';
import { backofficeKeys } from '@/lib/backoffice/query-keys';
import { toastApiError } from '@/lib/backoffice/format-api-error';
import type { ItemPartImage, ItemPartNested } from '@/types/backoffice';

interface ItemPartsTabProps {
  historicalItemId: number;
  itemParts: ItemPartNested[];
}

export function ItemPartsTab({ historicalItemId, itemParts }: ItemPartsTabProps) {
  const t = useTranslations('backoffice');
  const queryClient = useQueryClient();

  const createMut = useMutation({
    mutationFn: () => createItemPart({ historical_item: historicalItemId }),
    onSuccess: () => {
      toast.success(t('manuscriptsDetail.partAdded'));
      queryClient.invalidateQueries({
        queryKey: backofficeKeys.manuscripts.detail(historicalItemId),
      });
    },
    onError: (err) => {
      toastApiError(t('manuscriptsDetail.partAddFailed'), err);
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
  const t = useTranslations('backoffice');
  const tCommon = useTranslations('common');
  const queryClient = useQueryClient();

  const { location, change, dirty, save } = usePartLocation(part, historicalItemId, {
    saved: t('manuscriptsDetail.partUpdated'),
    failed: t('manuscriptsDetail.partUpdateFailed'),
  });
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);

  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: backofficeKeys.manuscripts.detail(historicalItemId),
    });

  const deleteMut = useMutation({
    mutationFn: () => deleteItemPart(part.id),
    onSuccess: () => {
      toast.success(t('manuscriptsDetail.partRemoved'));
      invalidate();
    },
    onError: (err) => {
      toastApiError(t('manuscriptsDetail.partRemoveFailed'), err);
    },
  });

  return (
    <Collapsible className="rounded-md border">
      <div className="flex items-center hover:bg-accent/30 transition-colors">
        <CollapsibleTrigger className="flex flex-1 items-center gap-3 px-4 py-3">
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
        {part.current_item !== null ? (
          <Link
            href={`/manuscripts/${part.id}`}
            target="_blank"
            rel="noopener noreferrer"
            title={t('manuscriptsDetail.viewPartPublicPage', { label: part.display_label })}
            className="px-3 py-3 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ExternalLink className="h-4 w-4" />
          </Link>
        ) : (
          <span className="w-10 shrink-0" />
        )}
      </div>

      <CollapsibleContent>
        <div className="border-t px-4 py-4 space-y-4">
          <PartLocationFields location={location} onChange={change} part={part} />

          <ItemPartHandsSection itemPartId={part.id} />

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
                    itemPartId={part.id}
                    itemPartLabel={part.display_label}
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
              onClick={() => save.mutate()}
              disabled={!dirty || save.isPending}
            >
              {save.isPending ? (
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
  itemPartId,
  itemPartLabel,
}: {
  image: ItemPartImage;
  historicalItemId: number;
  itemPartId: number;
  itemPartLabel: string;
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
          itemPartId={itemPartId}
          itemPartLabel={itemPartLabel}
        />
      )}
    </>
  );
}
