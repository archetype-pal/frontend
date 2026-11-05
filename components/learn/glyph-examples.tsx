'use client';

/**
 * Glyphs from other charters that a step or an answer shows: each one's crop,
 * letter-form, hand, charter and date, and a link to it in the manuscript
 * viewer. Every glyph was returned by a tool before the lesson could cite it,
 * so none is made up.
 */

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { ArrowUpRight, ImageOff } from 'lucide-react';

import { IiifImage } from '@/components/ui/iiif-image';
import { glyphHref, iiifSrc } from '@/lib/learn';
import { getGlyphPart } from '@/services/learn';
import type { LearnGlyph } from '@/types/learn';

function GlyphCard({ glyph, onThisPage }: { glyph: LearnGlyph; onThisPage: boolean }) {
  const t = useTranslations('learn.glyph');
  // The viewer's address needs the page's manuscript part, which the lesson
  // does not carry. One lookup serves every glyph of the same page.
  const part = useQuery({
    queryKey: ['learn-page-part', glyph.item_image],
    queryFn: () => getGlyphPart(glyph.id),
    staleTime: Infinity,
    retry: false,
  });
  const href = part.data ? glyphHref(glyph, part.data) : null;
  const [broken, setBroken] = useState(false);
  const crop = broken ? null : iiifSrc(glyph.crop_url);
  const name = glyph.letter_form || t('unnamed');

  return (
    <li className="relative flex flex-col overflow-hidden rounded-md border bg-card shadow-sm transition-shadow focus-within:ring-2 focus-within:ring-ring hover:shadow-md">
      <div className="relative aspect-square bg-muted/40">
        {crop ? (
          <IiifImage
            src={crop}
            alt={t('alt', { form: name, charter: glyph.charter })}
            fill
            sizes="10rem"
            onError={() => setBroken(true)}
            className="object-contain p-2"
          />
        ) : (
          <span className="flex h-full flex-col items-center justify-center gap-1 text-xs text-muted-foreground">
            <ImageOff className="h-5 w-5" aria-hidden />
            {t('noCrop')}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-0.5 border-t px-2.5 py-2 text-xs">
        <p className="flex items-baseline justify-between gap-1 text-sm font-medium leading-tight">
          <span>{name}</span>
          {onThisPage && (
            <span className="shrink-0 rounded bg-amber-100 px-1 text-[0.65rem] font-semibold uppercase tracking-wide text-amber-900">
              {t('thisPage')}
            </span>
          )}
        </p>
        {glyph.hand && <p className="line-clamp-1 text-muted-foreground">{glyph.hand}</p>}
        <p className="line-clamp-2 text-muted-foreground" title={glyph.page || glyph.charter}>
          {glyph.charter}
        </p>
        {glyph.date && <p className="text-muted-foreground">{glyph.date}</p>}
        {href && (
          <Link
            href={href}
            className="mt-1 inline-flex items-center gap-0.5 font-medium text-primary outline-none after:absolute after:inset-0 hover:underline"
          >
            {t('open')}
            <ArrowUpRight className="h-3 w-3" aria-hidden />
          </Link>
        )}
      </div>
    </li>
  );
}

/**
 * The examples a step or an answer shows. They come from other charters, or,
 * from the experts' annotations, enlarged from the lesson's own page: each of
 * those is marked, and the heading says which there are. `title` is the
 * heading when every example is from another page.
 */
export function GlyphExamples({
  glyphs,
  title,
  pageId,
}: {
  glyphs: LearnGlyph[];
  title: string;
  pageId: number | null;
}) {
  const t = useTranslations('learn.glyph');
  if (glyphs.length === 0) return null;
  const here = glyphs.filter((glyph) => glyph.item_image === pageId).length;
  const heading =
    here === 0 ? title : here === glyphs.length ? t('fromThisPage') : t('fromThisPageAndOthers');
  return (
    <div>
      <p className="text-sm font-semibold">{heading}</p>
      <ul aria-label={heading} className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {glyphs.map((glyph) => (
          <GlyphCard key={glyph.id} glyph={glyph} onThisPage={glyph.item_image === pageId} />
        ))}
      </ul>
    </div>
  );
}
