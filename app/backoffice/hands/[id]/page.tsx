'use client';

import { use, useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/auth-context';
import Link from 'next/link';
import { ArrowLeft, Loader2, Image as ImageIcon, Check, ExternalLink } from 'lucide-react';
import { IiifThumbnail } from '@/components/backoffice/common/iiif-thumbnail';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import dynamic from 'next/dynamic';
const RichTextEditor = dynamic(
  () => import('@/components/backoffice/common/rich-text-editor').then((m) => m.RichTextEditor),
  {
    ssr: false,
    loading: () => <div className="h-[200px] rounded-md border animate-pulse bg-muted" />,
  }
);
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/backoffice/common/confirm-dialog';
import { EntityEditorActions } from '@/components/backoffice/common/entity-editor-actions';
import {
  BackofficeErrorState,
  BackofficeLoadingState,
} from '@/components/backoffice/common/query-state';
import { getHand, updateHand, deleteHand } from '@/services/backoffice/scribes';
import { backofficeKeys } from '@/lib/backoffice/query-keys';
import { useEntityEditor } from '@/hooks/backoffice/use-entity-editor';
import { walkPaginated } from '@/lib/backoffice/walk-paginated';
import { authFetch } from '@/lib/api-fetch';
import type { AdminItemImage } from '@/services/backoffice/manuscripts';

export default function HandDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const t = useTranslations('backoffice');
  const { id: rawId } = use(params);
  const id = Number(rawId);
  const { token } = useAuth();
  const [deleteOpen, setDeleteOpen] = useState(false);

  const editor = useEntityEditor({
    id,
    queryKey: backofficeKeys.hands.detail(id),
    invalidateKeys: [backofficeKeys.hands.detail(id), backofficeKeys.hands.all()],
    fetchFn: getHand,
    toForm: (h) => ({
      name: h.name,
      place: h.place,
      description: h.description,
      item_part_images: h.item_part_images ?? [],
    }),
    saveFn: (t, hid, form) => updateHand(t, hid, form),
    deleteFn: deleteHand,
    listRoute: '/backoffice/hands',
    label: 'Hand',
  });

  // Fetch images for the hand's item part. Walk all pages — `limit: 200` was
  // silently capped at DRF's max_limit=100, so editors associating a hand with
  // images on a multi-folio cartulary couldn't reach folios past the 100th.
  const itemPart = editor.entity?.item_part;
  const { data: imagesData, isLoading: imagesLoading } = useQuery({
    queryKey: ['backoffice', 'item-images', itemPart],
    queryFn: () =>
      walkPaginated<AdminItemImage>(
        `/api/v1/manuscripts/management/item-images/?item_part=${itemPart}&limit=100`,
        (path) => authFetch(path, token!)
      ),
    enabled: !!token && !!itemPart,
  });

  const availableImages = useMemo(() => imagesData ?? [], [imagesData]);

  if (editor.isError) {
    return (
      <BackofficeErrorState
        message={t('handsDetail.failedLoad')}
        onRetry={() => editor.refetch()}
      />
    );
  }
  if (editor.isLoading || !editor.entity || !editor.form) {
    return <BackofficeLoadingState />;
  }

  const hand = editor.entity;
  const { form, setForm } = editor;

  const toggleImage = (imageId: number) => {
    setForm({
      item_part_images: form.item_part_images.includes(imageId)
        ? form.item_part_images.filter((i) => i !== imageId)
        : [...form.item_part_images, imageId],
    });
  };
  const selectAllImages = () => setForm({ item_part_images: availableImages.map((img) => img.id) });
  const deselectAllImages = () => setForm({ item_part_images: [] });

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <Link href="/backoffice/hands" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <h1 className="text-xl font-semibold">{hand.name}</h1>
          {hand.script_name && <Badge variant="outline">{hand.script_name}</Badge>}
        </div>
        <div className="flex items-center gap-2">
          <EntityEditorActions
            dirty={editor.dirty}
            isSaving={editor.isSaving}
            onSave={editor.save}
            onDelete={() => setDeleteOpen(true)}
          />
        </div>
      </div>

      {/* Read-only info card */}
      <div className="rounded-md border p-4 text-sm space-y-1">
        <p>
          <span className="text-muted-foreground">{t('handsDetail.labelScribe')}</span>{' '}
          <Link
            href={`/backoffice/scribes/${hand.scribe}`}
            className="text-primary hover:underline"
          >
            {hand.scribe_name}
          </Link>
        </p>
        <p>
          <span className="text-muted-foreground">{t('handsDetail.labelItemPart')}</span>{' '}
          <Link
            href={`/backoffice/manuscripts/${hand.item_part}`}
            className="text-primary hover:underline"
          >
            {hand.item_part_display}
          </Link>
        </p>
        {hand.date_display && (
          <p>
            <span className="text-muted-foreground">{t('handsDetail.labelDate')}</span>{' '}
            {hand.date_display}
          </p>
        )}
      </div>

      {/* Quick links */}
      <div className="flex items-center gap-2">
        <Link href={`/hands/${id}`} target="_blank">
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
            <ExternalLink className="h-3 w-3" />
            {t('handsDetail.viewPublicPage')}
          </Button>
        </Link>
        <Link href={`/backoffice/scribes/${hand.scribe}`}>
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
            {t('handsDetail.goToScribe')}
          </Button>
        </Link>
      </div>

      {/* Editable fields */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>{t('handsDetail.labelName')}</Label>
          <Input value={form.name} onChange={(e) => setForm({ name: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label>{t('handsDetail.labelPlace')}</Label>
          <Input value={form.place} onChange={(e) => setForm({ place: e.target.value })} />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>{t('handsDetail.labelDescription')}</Label>
        <RichTextEditor
          content={form.description}
          onChange={(html) => setForm({ description: html })}
          placeholder={t('handsDetail.descriptionPlaceholder')}
          minimal
        />
      </div>

      {/* Image selection section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ImageIcon className="h-4 w-4 text-muted-foreground" />
            <Label className="text-base">{t('handsDetail.imagesLabel')}</Label>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {t('handsDetail.imagesCount', {
                selected: form.item_part_images.length,
                total: availableImages.length,
              })}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={selectAllImages}
              disabled={form.item_part_images.length === availableImages.length}
            >
              {t('handsDetail.selectAll')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={deselectAllImages}
              disabled={form.item_part_images.length === 0}
            >
              {t('handsDetail.deselectAll')}
            </Button>
          </div>
        </div>

        {imagesLoading ? (
          <div className="flex items-center justify-center h-24 rounded-md border border-dashed">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : availableImages.length === 0 ? (
          <div className="rounded-md border border-dashed p-6 text-center text-muted-foreground text-sm">
            {t('handsDetail.noImages')}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {availableImages.map((img) => {
              const isSelected = form.item_part_images.includes(img.id);
              return (
                <button
                  key={img.id}
                  type="button"
                  onClick={() => toggleImage(img.id)}
                  className={`
                    relative group rounded-lg border-2 p-3 text-left transition-all
                    ${
                      isSelected
                        ? 'border-primary bg-primary/5'
                        : 'border-muted hover:border-muted-foreground/30'
                    }
                  `}
                >
                  {/* Check indicator */}
                  <div
                    className={`
                      absolute top-2 right-2 h-5 w-5 rounded-full flex items-center justify-center transition-colors
                      ${
                        isSelected
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-transparent group-hover:bg-muted-foreground/20'
                      }
                    `}
                  >
                    <Check className="h-3 w-3" />
                  </div>

                  <IiifThumbnail image={img.image} locus={img.locus} className="mb-2" />

                  <div className="space-y-0.5">
                    <p className="text-xs font-medium truncate">
                      {img.locus || `Image #${img.id}`}
                    </p>
                    <p className="text-[10px] text-muted-foreground">ID: {img.id}</p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={t('handsDetail.deleteTitle', { name: hand.name })}
        description={t('handsDetail.deleteDescription')}
        confirmLabel={t('handsDetail.deleteConfirm')}
        loading={editor.isDeleting}
        onConfirm={editor.remove}
      />
    </div>
  );
}
