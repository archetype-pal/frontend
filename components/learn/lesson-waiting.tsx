'use client';

/**
 * A lesson the tutor is still writing: what it has done so far, line by line
 * as it goes, and how long it has taken. A lesson takes minutes, so the page
 * says so, and that its link can be left and come back to.
 */

import { useTranslations } from 'next-intl';
import { Check, Clock, Loader2 } from 'lucide-react';

import { IiifImage } from '@/components/ui/iiif-image';
import { useNow } from '@/hooks/use-now';
import { SLOW_LESSON_MS, formatElapsed, iiifSrc } from '@/lib/learn';
import type { TutorSession } from '@/types/learn';

export function LessonWaiting({
  session,
  pictureUrl,
  paused,
  pollFailed,
  actions,
}: {
  session: TutorSession;
  pictureUrl: string | null;
  paused: boolean;
  pollFailed: boolean;
  actions?: React.ReactNode;
}) {
  const t = useTranslations('learn.waiting');
  const now = useNow();
  const started = Date.parse(session.created);
  const elapsed = now > 0 && Number.isFinite(started) ? now - started : 0;
  const preview = pictureUrl ?? iiifSrc(session.page?.thumbnail_url);
  const progress = session.progress;

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t('title')}</h1>
      <p className="mt-2 text-muted-foreground">{t('intro')}</p>

      <div className="mt-6 overflow-hidden rounded-lg border bg-card shadow-sm">
        <div className="flex flex-col gap-4 p-5 sm:flex-row">
          {preview && (
            <div className="relative h-40 w-full shrink-0 overflow-hidden rounded-md bg-muted/50 sm:h-36 sm:w-32">
              <IiifImage
                src={preview}
                alt={session.page?.label ?? t('pictureAlt')}
                fill
                sizes="8rem"
                loading="eager"
                className="object-contain"
              />
            </div>
          )}
          <div className="min-w-0 flex-1 space-y-3">
            {session.page && (
              <div className="text-sm">
                <p className="font-medium">{session.page.label}</p>
                <p className="text-muted-foreground">
                  {[session.page.charter, session.page.date].filter(Boolean).join(' · ')}
                </p>
              </div>
            )}
            <p className="flex items-center gap-2 text-sm tabular-nums text-muted-foreground">
              <Clock className="h-4 w-4" aria-hidden />
              {t('elapsed', { time: formatElapsed(elapsed) })}
            </p>
            <ol
              role="log"
              aria-live="polite"
              aria-label={t('progressLabel')}
              className="space-y-2 text-sm"
            >
              {progress.map((line, index) => (
                <li key={`${line.at}-${index}`} className="flex gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
                  <span>{line.text}</span>
                </li>
              ))}
              <li className="flex gap-2 text-muted-foreground">
                <Loader2
                  className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-primary"
                  aria-hidden
                />
                <span>{session.status === 'queued' ? t('queued') : t('working')}</span>
              </li>
            </ol>
          </div>
        </div>
        {(elapsed > SLOW_LESSON_MS || paused || pollFailed) && (
          <div className="space-y-1 border-t bg-muted/30 px-5 py-3 text-sm text-muted-foreground">
            {elapsed > SLOW_LESSON_MS && <p>{t('slow')}</p>}
            {paused && <p>{t('paused')}</p>}
            {pollFailed && <p>{t('pollFailed')}</p>}
          </div>
        )}
      </div>

      {actions && <div className="mt-4 flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
