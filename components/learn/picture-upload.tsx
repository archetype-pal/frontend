'use client';

/**
 * A picture of the student's own to learn from. It is checked here against
 * what the backend reads (kind and size) before anything is sent, and the
 * student is told, before they send it, where it goes and how long it stays.
 */

import { useEffect, useRef, useState, type DragEvent } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ImagePlus, Loader2, LogIn, ShieldCheck } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { LearnRefusal } from '@/components/learn/learn-refusal';
import { formatBytes } from '@/lib/format-bytes';
import { MAX_PICTURE_BYTES, PICTURE_TYPES, pictureProblem, type PictureProblem } from '@/lib/learn';
import { cn } from '@/lib/utils';
import type { LearnStatus } from '@/types/learn';

const MAX_MB = MAX_PICTURE_BYTES / (1024 * 1024);

type Chosen = { file: File; preview: string | null };

/** Browsers show JPEG, PNG and WebP; most cannot show a TIFF, which the tutor still reads. */
function previewOf(file: File): string | null {
  if (file.type === 'image/tiff' || file.type === '') return null;
  if (typeof URL.createObjectURL !== 'function') return null;
  return URL.createObjectURL(file);
}

function UploadForm({
  retentionDays,
  starting,
  disabled,
  error,
  onStart,
}: {
  retentionDays: number;
  starting: boolean;
  disabled: boolean;
  error: unknown;
  onStart: (file: File) => void;
}) {
  const t = useTranslations('learn.upload');
  const [chosen, setChosen] = useState<Chosen | null>(null);
  const [problem, setProblem] = useState<PictureProblem | null>(null);
  const [dragging, setDragging] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  // A preview holds the file in memory until its URL is let go.
  useEffect(() => {
    const preview = chosen?.preview;
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [chosen]);

  const choose = (file: File | undefined) => {
    if (!file) return;
    const found = pictureProblem(file);
    setProblem(found);
    setChosen(found ? null : { file, preview: previewOf(file) });
  };
  const clear = () => {
    setChosen(null);
    setProblem(null);
    if (input.current) input.current.value = '';
  };
  const onDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setDragging(false);
    if (!disabled) choose(event.dataTransfer.files?.[0]);
  };

  return (
    <div className="space-y-4">
      {chosen ? (
        <figure className="overflow-hidden rounded-md border bg-muted/30">
          {chosen.preview ? (
            // oxlint-disable-next-line @next/next/no-img-element -- a local object URL, not a remote image
            <img
              src={chosen.preview}
              alt={t('preview')}
              className="mx-auto max-h-56 w-auto object-contain"
            />
          ) : (
            <p className="px-4 py-6 text-center text-xs text-muted-foreground">{t('noPreview')}</p>
          )}
          <figcaption className="flex items-baseline justify-between gap-3 border-t bg-card px-3 py-2 text-xs">
            <span className="min-w-0 truncate font-medium" title={chosen.file.name}>
              {chosen.file.name}
            </span>
            <span className="shrink-0 text-muted-foreground">{formatBytes(chosen.file.size)}</span>
          </figcaption>
        </figure>
      ) : (
        <label
          htmlFor="learn-picture"
          onDragOver={(event) => {
            event.preventDefault();
            if (!disabled) setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={cn(
            'flex cursor-pointer flex-col items-center gap-2 rounded-md border-2 border-dashed px-4 py-8 text-center transition-colors',
            'hover:border-primary/50 hover:bg-primary/5 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring',
            dragging ? 'border-primary bg-primary/5' : 'border-border',
            disabled && 'pointer-events-none opacity-60'
          )}
        >
          <ImagePlus className="h-7 w-7 text-primary" aria-hidden />
          <span className="text-sm font-medium text-primary">{t('choose')}</span>
          <span className="text-xs text-muted-foreground">{t('drop')}</span>
          <span className="text-xs text-muted-foreground">{t('formats', { size: MAX_MB })}</span>
          <input
            ref={input}
            id="learn-picture"
            type="file"
            accept={PICTURE_TYPES.join(',')}
            className="sr-only"
            disabled={disabled}
            onChange={(event) => choose(event.target.files?.[0])}
          />
        </label>
      )}

      {problem && (
        <p role="alert" className="text-sm text-destructive">
          {t(`problem.${problem}`, { size: MAX_MB })}
        </p>
      )}
      {Boolean(error) && <LearnRefusal error={error} />}

      {chosen && (
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={() => onStart(chosen.file)} disabled={disabled}>
            {starting && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />}
            {t('start')}
          </Button>
          <Button type="button" variant="ghost" onClick={clear} disabled={starting}>
            {t('remove')}
          </Button>
        </div>
      )}

      <p className="flex gap-2 text-xs leading-relaxed text-muted-foreground">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        <span>{t('privacy', { days: retentionDays })}</span>
      </p>
    </div>
  );
}

export function PictureUpload({
  status,
  starting,
  disabled,
  error,
  onStart,
}: {
  status: LearnStatus;
  starting: boolean;
  disabled: boolean;
  error: unknown;
  onStart: (file: File) => void;
}) {
  const t = useTranslations('learn.upload');

  if (status.may_upload) {
    return (
      <UploadForm
        retentionDays={status.retention_days}
        starting={starting}
        disabled={disabled}
        error={error}
        onStart={onStart}
      />
    );
  }
  if (status.uploads === 'nobody') {
    return <p className="text-sm text-muted-foreground">{t('nobody')}</p>;
  }
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">{t('signIn')}</p>
      <Button asChild variant="outline" size="sm">
        <Link href="/login">
          <LogIn className="mr-1.5 h-4 w-4" aria-hidden />
          {t('signInLink')}
        </Link>
      </Button>
    </div>
  );
}
