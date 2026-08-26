'use client';

import { useCallback, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { FileImage, Upload, X } from 'lucide-react';
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
import { cn } from '@/lib/utils';
import {
  ACCEPTED_UPLOAD_EXTENSIONS,
  formatBytes,
  guessLocusFromFilename,
  isAcceptedImageFilename,
} from '@/lib/backoffice/upload-helpers';
import { useUploadManager } from '@/contexts/upload-manager-context';

interface ItemImageUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemPartId: number;
  itemPartLabel: string;
  historicalItemId: number;
}

interface StagedFile {
  id: string;
  file: File;
  locus: string;
  tags: string;
}

/**
 * Staging form for image uploads. It only collects files + per-file locus/tags
 * and hands them to the shell-level upload manager, then closes immediately —
 * the actual upload + conversion runs in the background (see the upload tray),
 * so the editor is never blocked waiting on a large transfer.
 */
/** `crypto.randomUUID` is secure-context-only and throws on a plain-HTTP
 *  origin — which here would be straight out of a drop handler. Mirrors
 *  `newId()` in lib/search-query.ts. */
function newId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `id_${Math.random().toString(36).slice(2)}`;
}

export function ItemImageUploadDialog({
  open,
  onOpenChange,
  itemPartId,
  itemPartLabel,
  historicalItemId,
}: ItemImageUploadDialogProps) {
  const t = useTranslations('backoffice');
  const { enqueue } = useUploadManager();
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<StagedFile[]>([]);
  const [dragOver, setDragOver] = useState(false);

  const addFiles = useCallback(
    (fileList: FileList | File[]) => {
      const incoming = Array.from(fileList);
      const accepted: StagedFile[] = [];
      const rejected: string[] = [];
      for (const file of incoming) {
        if (isAcceptedImageFilename(file.name)) {
          accepted.push({
            id: newId(),
            file,
            locus: guessLocusFromFilename(file.name),
            tags: '',
          });
        } else {
          rejected.push(file.name);
        }
      }
      if (accepted.length) setFiles((prev) => [...prev, ...accepted]);
      if (rejected.length) {
        toast.error(t('uploads.toast.skipped', { count: rejected.length }), {
          description: t('uploads.toast.allowed', {
            list: ACCEPTED_UPLOAD_EXTENSIONS.join(', '),
          }),
        });
      }
    },
    [t]
  );

  const patchFile = useCallback((id: string, partial: Partial<StagedFile>) => {
    setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, ...partial } : f)));
  }, []);

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
    },
    [addFiles]
  );

  const close = (next: boolean) => {
    if (!next) setFiles([]);
    onOpenChange(next);
  };

  const startUpload = () => {
    enqueue(
      files.map((f) => ({ file: f.file, locus: f.locus.trim(), tags: f.tags.trim() })),
      { itemPartId, itemPartLabel, historicalItemId }
    );
    const count = files.length;
    toast.success(t('uploads.toast.queued', { count }), {
      description: t('uploads.toast.queuedHint'),
    });
    close(false);
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="flex max-h-[85vh] max-w-2xl flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle>{t('uploads.addImages')}</DialogTitle>
          <DialogDescription>
            {t.rich('uploads.description', {
              part: itemPartLabel,
              strong: (chunks) => <span className="font-medium">{chunks}</span>,
            })}
          </DialogDescription>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-3 px-1">
          {/* Drop zone */}
          <div
            role="button"
            tabIndex={0}
            aria-label={t('uploads.a11y.addFiles')}
            onClick={() => inputRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                inputRef.current?.click();
              }
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={cn(
              'flex shrink-0 flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed p-6 text-center cursor-pointer transition-colors',
              dragOver
                ? 'border-primary bg-primary/5'
                : 'border-muted-foreground/25 hover:border-primary/50'
            )}
          >
            <Upload className="h-8 w-8 text-muted-foreground opacity-50" />
            <p className="text-sm font-medium">{t('uploads.dropzone')}</p>
            <p className="text-xs text-muted-foreground">{ACCEPTED_UPLOAD_EXTENSIONS.join(', ')}</p>
            <input
              ref={inputRef}
              type="file"
              multiple
              accept={ACCEPTED_UPLOAD_EXTENSIONS.join(',')}
              className="hidden"
              aria-label={t('uploads.a11y.chooseFiles')}
              onChange={(e) => {
                if (e.target.files?.length) addFiles(e.target.files);
                if (inputRef.current) inputRef.current.value = '';
              }}
            />
          </div>

          {/* Staged files — native overflow scroll within the flex-bounded height */}
          {files.length > 0 && (
            <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
              {files.map((f) => (
                <StagedFileItem
                  key={f.id}
                  staged={f}
                  onLocusChange={(v) => patchFile(f.id, { locus: v })}
                  onTagsChange={(v) => patchFile(f.id, { tags: v })}
                  onRemove={() => removeFile(f.id)}
                />
              ))}
            </ul>
          )}
        </div>

        <DialogFooter className="shrink-0 border-t pt-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={() => close(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            className="h-8 gap-1 text-xs"
            onClick={startUpload}
            disabled={files.length === 0}
          >
            <Upload className="h-3 w-3" />
            {`Upload ${files.length || ''} image${files.length === 1 ? '' : 's'}`.trim()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StagedFileItem({
  staged,
  onLocusChange,
  onTagsChange,
  onRemove,
}: {
  staged: StagedFile;
  onLocusChange: (value: string) => void;
  onTagsChange: (value: string) => void;
  onRemove: () => void;
}) {
  const t = useTranslations('backoffice');
  return (
    <li className="rounded-md border p-2.5">
      <div className="flex items-start gap-2.5">
        <FileImage className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-sm font-medium" title={staged.file.name}>
              {staged.file.name}
            </p>
            <span className="shrink-0 text-xs text-muted-foreground">
              {formatBytes(staged.file.size)}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label htmlFor={`locus-${staged.id}`} className="text-[10px] text-muted-foreground">
                {t('uploads.locus')}
              </Label>
              <Input
                id={`locus-${staged.id}`}
                value={staged.locus}
                onChange={(e) => onLocusChange(e.target.value)}
                placeholder={t('uploads.locusPlaceholder')}
                className="h-7 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`tags-${staged.id}`} className="text-[10px] text-muted-foreground">
                {t('uploads.tags')}
              </Label>
              <Input
                id={`tags-${staged.id}`}
                value={staged.tags}
                onChange={(e) => onTagsChange(e.target.value)}
                placeholder={t('uploads.tagsPlaceholder')}
                className="h-7 text-xs"
              />
            </div>
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-6 w-6 shrink-0"
          aria-label={t('uploads.a11y.remove', { name: staged.file.name })}
          onClick={onRemove}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    </li>
  );
}
