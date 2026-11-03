'use client';

/**
 * Shared "+ New image-text" dialog.
 *
 * Three entry points use this:
 *   - the texts list toolbar ("+ New" with manual item_image input)
 *   - the texts list's "Import TEI" (`fromTeiFile`: the content comes from a
 *     file that must validate before the draft can be created)
 *   - the uncovered-images drilldown ("+ Transcription" / "+ Translation"
 *     buttons that pre-fill item_image and type)
 *
 * An image holds at most one text of each type (enforced in the DB), so
 * the dialog checks the image's texts as the id is typed and blocks a type
 * that already exists.
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2, Loader2, Upload } from 'lucide-react';
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
import { createImageText, validateTei, type TeiValidationError } from '@/services/image-texts';
import {
  describeCreateError,
  ExistingTextNotice,
  useExistingImageText,
} from '@/components/backoffice/image-text-create-guards';
import { backofficeKeys } from '@/lib/backoffice/query-keys';
import type { ImageTextKind } from '@/types/image-text';

type NewTextKind = ImageTextKind;
export type { NewTextKind };

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
  /** Create the draft from a TEI file, which must validate first. */
  fromTeiFile?: boolean;
}

/** A chosen TEI file's text, and whether the validator accepted it. */
type TeiFile = { content: string; valid: boolean };

export function NewImageTextDialog({
  open,
  onOpenChange,
  defaultItemImage = null,
  defaultType = 'Transcription',
  lockItemImage = false,
  lockType = false,
  fromTeiFile = false,
}: NewImageTextDialogProps) {
  const t = useTranslations('backoffice');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const queryClient = useQueryClient();

  // One state object so the open-reset effect performs a single setState
  // call (the lint rule guards against multi-step in-effect cascades, not
  // a single one).
  const [form, setForm] = useState({
    itemImage: defaultItemImage ? String(defaultItemImage) : '',
    type: defaultType,
    language: '',
    tei: null as TeiFile | null,
  });
  const { itemImage, type, language, tei } = form;
  const copy = fromTeiFile
    ? {
        title: 'importTei.title',
        description: 'importTei.description',
        submit: 'importTei.importButton',
      }
    : {
        title: 'imageTexts.newDialogTitle',
        description: 'imageTexts.newDialogDescription',
        submit: 'imageTexts.newCreateButton',
      };
  const itemImageNumber = Number(itemImage);
  const existing = useExistingImageText(itemImageNumber, type);

  // Re-prime fields each time the dialog reopens — without this, opening
  // it twice in a row would carry over the previous attempt's input.
  useEffect(() => {
    if (!open) return;
    // oxlint-disable-next-line react-hooks/set-state-in-effect
    setForm({
      itemImage: defaultItemImage ? String(defaultItemImage) : '',
      type: defaultType,
      language: '',
      tei: null,
    });
  }, [open, defaultItemImage, defaultType]);

  const createMut = useMutation({
    mutationFn: () =>
      createImageText({
        item_image: Number(itemImage),
        type,
        language,
        ...(fromTeiFile ? { content: tei?.content ?? '' } : {}),
      }),
    onSuccess: (saved) => {
      const toastKey = fromTeiFile ? 'importTei.toastImported' : 'imageTexts.toastCreated';
      toast.success(t(toastKey, { type: saved.type.toLowerCase(), id: saved.id }));
      queryClient.invalidateQueries({ queryKey: backofficeKeys.imageTexts.all() });
      queryClient.invalidateQueries({ queryKey: backofficeKeys.textsMonitor.overview() });
      queryClient.invalidateQueries({ queryKey: backofficeKeys.uncoveredImages.all() });
      onOpenChange(false);
      router.push(`/backoffice/image-texts/${saved.id}`);
    },
    onError: (err) => {
      toast.error(t(fromTeiFile ? 'importTei.toastImportFailed' : 'imageTexts.toastCreateFailed'), {
        description: describeCreateError(err, t, itemImageNumber, type),
      });
    },
  });

  const canSubmit =
    Number.isFinite(itemImageNumber) &&
    itemImageNumber > 0 &&
    !!type &&
    !existing &&
    (!fromTeiFile || !!tei?.valid) &&
    !createMut.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t(copy.title)}</DialogTitle>
          <DialogDescription>{t(copy.description)}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 px-5 py-2">
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
          {existing ? <ExistingTextNotice text={existing} /> : null}
          {fromTeiFile ? (
            <TeiFileField onChange={(file) => setForm((f) => ({ ...f, tei: file }))} />
          ) : null}
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
            {t(copy.submit)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TeiFileField({ onChange }: { onChange: (file: TeiFile | null) => void }) {
  const t = useTranslations('backoffice');
  const [fileName, setFileName] = useState<string | null>(null);
  const [errors, setErrors] = useState<TeiValidationError[] | null>(null);
  const [validating, setValidating] = useState(false);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    const content = await file.text();
    setFileName(file.name);
    setErrors(null);
    setValidating(true);
    onChange(null);
    let found: TeiValidationError[];
    try {
      found = (await validateTei(content)).errors;
    } catch {
      found = [{ line: 0, col: 0, message: t('importTei.validatorUnreachable') }];
    }
    setErrors(found);
    setValidating(false);
    onChange({ content, valid: found.length === 0 });
  }

  return (
    <div className="space-y-1.5">
      <Label htmlFor="new-text-file">{t('importTei.fileLabel')}</Label>
      <Input
        id="new-text-file"
        type="file"
        accept=".tei,.xml,application/xml,text/xml"
        onChange={(e) => void handleFile(e.target.files?.[0])}
      />
      {fileName && (
        <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Upload className="h-3 w-3" /> {fileName}
        </p>
      )}
      {validating && (
        <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" /> {t('importTei.validatingLabel')}
        </p>
      )}
      {errors !== null &&
        !validating &&
        (errors.length === 0 ? (
          <p className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-3.5 w-3.5" /> {t('importTei.validLabel')}
          </p>
        ) : (
          <p className="flex items-center gap-1.5 text-[11px] font-medium text-destructive">
            <AlertTriangle className="h-3.5 w-3.5" />
            {t('importTei.lineErrorLabel', { line: errors[0].line, message: errors[0].message })}
          </p>
        ))}
    </div>
  );
}
