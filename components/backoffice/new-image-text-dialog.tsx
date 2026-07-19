'use client';

/**
 * Shared "+ New image-text" dialog.
 *
 * Two entry points use this:
 *   - the texts list toolbar ("+ New" with manual item_image input)
 *   - the uncovered-images drilldown ("+ Transcription" / "+ Translation"
 *     buttons that pre-fill item_image and type)
 *
 * The (item_image, type) uniqueness constraint is enforced in the DB;
 * any 4xx response is surfaced verbatim instead of being swallowed so
 * the editor sees "already exists" cleanly.
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/contexts/auth-context';
import { createImageText } from '@/services/image-texts';

export type NewTextKind = 'Transcription' | 'Translation';

export interface NewImageTextDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Pre-fill the image id (e.g. from "+ Transcription" on uncovered list). */
  defaultItemImage?: number | null;
  defaultType?: NewTextKind;
  /** Lock the item-image input — used for quick-create from uncovered list. */
  lockItemImage?: boolean;
  /** Lock the type field — used when entry point implies kind. */
  lockType?: boolean;
}

export function NewImageTextDialog({
  open,
  onOpenChange,
  defaultItemImage = null,
  defaultType = 'Transcription',
  lockItemImage = false,
  lockType = false,
}: NewImageTextDialogProps) {
  const t = useTranslations('backoffice');
  const tCommon = useTranslations('common');
  const { token } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

  // One state object so the open-reset effect performs a single setState
  // call (the lint rule guards against multi-step in-effect cascades, not
  // a single one).
  const [form, setForm] = useState({
    itemImage: defaultItemImage ? String(defaultItemImage) : '',
    type: defaultType,
    language: '',
  });
  const { itemImage, type, language } = form;

  // Re-prime fields each time the dialog reopens — without this, opening
  // it twice in a row would carry over the previous attempt's input.
  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setForm({
      itemImage: defaultItemImage ? String(defaultItemImage) : '',
      type: defaultType,
      language: '',
    });
  }, [open, defaultItemImage, defaultType]);

  const createMut = useMutation({
    mutationFn: () =>
      createImageText(token!, {
        item_image: Number(itemImage),
        type,
        language,
      }),
    onSuccess: (saved) => {
      toast.success(t('imageTexts.toastCreated', { type: saved.type.toLowerCase(), id: saved.id }));
      queryClient.invalidateQueries({ queryKey: ['backoffice', 'image-texts', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['backoffice', 'texts-monitor', 'overview'] });
      queryClient.invalidateQueries({ queryKey: ['backoffice', 'uncovered-images'] });
      onOpenChange(false);
      router.push(`/backoffice/image-texts/${saved.id}`);
    },
    onError: (err: Error) => {
      // Surface the API message (item_image FK error, uniqueness
      // constraint, etc.) so the editor knows what to fix without
      // diving into devtools.
      toast.error(t('imageTexts.toastCreateFailed'), { description: err.message.slice(0, 240) });
    },
  });

  const itemImageNumber = Number(itemImage);
  const canSubmit =
    !!token &&
    Number.isFinite(itemImageNumber) &&
    itemImageNumber > 0 &&
    !!type &&
    !createMut.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('imageTexts.newDialogTitle')}</DialogTitle>
          <DialogDescription>{t('imageTexts.newDialogDescription')}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="new-text-image">{t('imageTexts.newItemImageLabel')}</Label>
            <Input
              id="new-text-image"
              inputMode="numeric"
              value={itemImage}
              onChange={(e) =>
                setForm((f) => ({ ...f, itemImage: e.target.value.replace(/[^0-9]/g, '') }))
              }
              disabled={lockItemImage}
              placeholder={t('imageTexts.newItemImagePlaceholder')}
            />
            <p className="text-[11px] text-muted-foreground">{t('imageTexts.newItemImageHelp')}</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{t('imageTexts.fieldType')}</Label>
              <Select
                value={type}
                onValueChange={(v) => setForm((f) => ({ ...f, type: v as NewTextKind }))}
                disabled={lockType}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Transcription">{t('imageTexts.typeTranscription')}</SelectItem>
                  <SelectItem value="Translation">{t('imageTexts.typeTranslation')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-text-lang">{t('imageTexts.fieldLanguage')}</Label>
              <Input
                id="new-text-lang"
                value={language}
                onChange={(e) => setForm((f) => ({ ...f, language: e.target.value }))}
                placeholder={t('imageTexts.newLanguagePlaceholder')}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={createMut.isPending}
          >
            {tCommon('cancel')}
          </Button>
          <Button size="sm" disabled={!canSubmit} onClick={() => createMut.mutate()}>
            {createMut.isPending ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : null}
            {t('imageTexts.newCreateButton')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
