'use client';

/**
 * The corpus pages a lesson can start from: those experts annotated most,
 * which give the tutor the most to point at. One click starts a lesson.
 */

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { ImageOff, Loader2 } from 'lucide-react';

import { IiifImage } from '@/components/ui/iiif-image';
import { Skeleton } from '@/components/ui/skeleton';
import { iiifSrc } from '@/lib/learn';
import { cn } from '@/lib/utils';
import type { LearnPage } from '@/types/learn';

function PageCard({
  page,
  starting,
  disabled,
  onStart,
}: {
  page: LearnPage;
  starting: boolean;
  disabled: boolean;
  onStart: (page: LearnPage) => void;
}) {
  const t = useTranslations('learn.pages');
  const [broken, setBroken] = useState(false);
  const thumbnail = broken ? null : iiifSrc(page.thumbnail_url);
  const detailsId = `learn-page-${page.id}-details`;
  return (
    <li>
      <button
        type="button"
        onClick={() => onStart(page)}
        disabled={disabled}
        aria-label={t('start', { label: page.label })}
        aria-describedby={detailsId}
        aria-busy={starting}
        className={cn(
          'group flex h-full w-full flex-col overflow-hidden rounded-lg border bg-card text-left shadow-sm transition',
          'hover:border-primary/50 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          'disabled:cursor-not-allowed',
          disabled && !starting && 'opacity-60',
          starting && 'border-primary/60 ring-1 ring-primary/30'
        )}
      >
        <span className="relative block aspect-[4/3] w-full overflow-hidden bg-muted/50">
          {thumbnail ? (
            <IiifImage
              src={thumbnail}
              alt=""
              fill
              sizes="(min-width: 1024px) 14rem, (min-width: 640px) 33vw, 50vw"
              onError={() => setBroken(true)}
              className="object-contain p-1.5 transition-transform duration-300 group-hover:scale-[1.03]"
            />
          ) : (
            <span className="flex h-full items-center justify-center text-muted-foreground">
              <ImageOff className="h-6 w-6" aria-hidden />
              <span className="sr-only">{t('noThumbnail')}</span>
            </span>
          )}
          {starting && (
            <span className="absolute inset-0 flex items-center justify-center gap-2 bg-background/80 text-sm font-medium">
              <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden />
              {t('starting')}
            </span>
          )}
        </span>
        <span className="flex flex-1 flex-col gap-1 p-3">
          <span className="line-clamp-2 text-sm font-medium leading-snug">{page.label}</span>
          <span id={detailsId} className="flex flex-col gap-1">
            {page.charter && (
              <span className="line-clamp-2 text-xs text-muted-foreground">{page.charter}</span>
            )}
            {page.date && <span className="text-xs text-muted-foreground">{page.date}</span>}
          </span>
          <span className="mt-auto pt-2 text-xs font-medium text-primary opacity-80 group-hover:opacity-100">
            {t('cta')}
          </span>
        </span>
      </button>
    </li>
  );
}

export function LearnPages({
  pages,
  isLoading,
  isError,
  startingId,
  disabled,
  onStart,
}: {
  pages: LearnPage[] | undefined;
  isLoading: boolean;
  isError: boolean;
  startingId: number | null;
  disabled: boolean;
  onStart: (page: LearnPage) => void;
}) {
  const t = useTranslations('learn.pages');

  if (isLoading) {
    return (
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3" aria-hidden>
        {Array.from({ length: 6 }, (_, index) => (
          <li key={index} className="overflow-hidden rounded-lg border bg-card">
            <Skeleton className="aspect-[4/3] w-full rounded-none" />
            <div className="space-y-2 p-3">
              <Skeleton className="h-4 w-4/5" />
              <Skeleton className="h-3 w-3/5" />
            </div>
          </li>
        ))}
      </ul>
    );
  }
  if (isError) return <p className="text-sm text-muted-foreground">{t('error')}</p>;
  if (!pages || pages.length === 0) {
    return <p className="text-sm text-muted-foreground">{t('empty')}</p>;
  }
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {pages.map((page) => (
        <PageCard
          key={page.id}
          page={page}
          starting={startingId === page.id}
          disabled={disabled}
          onStart={onStart}
        />
      ))}
    </ul>
  );
}
