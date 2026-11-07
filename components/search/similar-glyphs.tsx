'use client';

/**
 * "Letters like this" (AI programme W1.2): the glyphs whose shape lies nearest
 * one glyph's, nearest first, from the backend's vector search. By default it
 * looks only in other charters, since a glyph's nearest neighbours are usually
 * its own scribe's letters on the same page.
 */

import { useState } from 'react';
import Link from 'next/link';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { ArrowLeft } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { IiifImage } from '@/components/ui/iiif-image';
import { GraphDetailLink } from '@/components/search/graph-detail-link';
import { SearchGrid } from '@/components/search/search-grid';
import { useIiifThumbnailUrl } from '@/hooks/use-iiif-thumbnail';
import { SIMILAR_GLYPHS_PAGE_SIZE } from '@/lib/similar-glyphs';
import { SimilarGlyphsError, getGlyph, getSimilarGlyphs } from '@/services/glyph-search';
import type { GraphListItem } from '@/types/search';

const SOURCE_CROP_PIXELS = 360;

function failureMessageKey(error: unknown): 'noVector' | 'unavailable' | 'error' {
  if (error instanceof SimilarGlyphsError) {
    if (error.reason === 'no-vector') return 'noVector';
    if (error.reason === 'unavailable') return 'unavailable';
  }
  return 'error';
}

function SourceGlyph({ glyph }: { glyph: GraphListItem }) {
  const t = useTranslations('similarGlyphs');
  const imageUrl = useIiifThumbnailUrl(
    (glyph.image_iiif || '').trim(),
    glyph.coordinates,
    SOURCE_CROP_PIXELS
  );
  const label = glyph.display_label || glyph.shelfmark;
  return (
    <figure className="flex items-center gap-4 rounded-lg border border-border bg-card p-3 shadow-sm">
      <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-md bg-muted/30">
        {imageUrl && (
          <IiifImage src={imageUrl} alt={label} fill className="object-contain" sizes="96px" />
        )}
      </div>
      <figcaption className="min-w-0 space-y-1 text-sm">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{t('source')}</p>
        <p className="font-serif text-base font-medium">{glyph.allograph || glyph.character}</p>
        <p className="truncate text-muted-foreground">
          {[label, glyph.locus].filter(Boolean).join(' · ')}
        </p>
        <GraphDetailLink graph={glyph} className="text-primary underline-offset-4 hover:underline">
          {t('openInViewer')}
        </GraphDetailLink>
      </figcaption>
    </figure>
  );
}

export function SimilarGlyphs({ graphId }: { graphId: number }) {
  const t = useTranslations('similarGlyphs');
  const [otherCharters, setOtherCharters] = useState(true);
  const [sameLetter, setSameLetter] = useState(false);
  const [offset, setOffset] = useState(0);

  const source = useQuery({
    queryKey: ['glyph', graphId],
    queryFn: () => getGlyph(graphId),
    retry: false,
  });
  const glyph = source.data;
  const searchable = Boolean(glyph?.has_glyph_vector);
  const similar = useQuery({
    queryKey: ['similar-glyphs', graphId, otherCharters, sameLetter, offset],
    queryFn: () =>
      getSimilarGlyphs(graphId, {
        excludeShelfmark: otherCharters ? glyph?.shelfmark : null,
        character: sameLetter ? glyph?.character : null,
        offset,
      }),
    enabled: searchable,
    placeholderData: keepPreviousData,
    retry: false,
  });

  const page = similar.data;
  const failure = source.error ?? similar.error;
  const message = failure
    ? t(failureMessageKey(failure))
    : glyph && !searchable
      ? t('noVector')
      : null;

  const filter = (setter: (value: boolean) => void) => (checked: boolean | 'indeterminate') => {
    setter(checked === true);
    setOffset(0);
  };

  return (
    <div className="container mx-auto max-w-6xl space-y-6 px-4 py-10">
      <Link
        href="/search/graphs"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        {t('backToSearch')}
      </Link>
      <header className="space-y-2">
        <h1 className="font-serif text-3xl font-semibold">{t('title')}</h1>
        <p className="max-w-3xl text-muted-foreground">{t('intro')}</p>
      </header>

      {glyph && <SourceGlyph glyph={glyph} />}

      {message ? (
        <p role="status" className="rounded-md border border-border bg-muted/30 p-4 text-sm">
          {message}
        </p>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
            <label className="inline-flex items-center gap-2">
              <Checkbox checked={otherCharters} onCheckedChange={filter(setOtherCharters)} />
              {t('otherCharters')}
            </label>
            {glyph?.character && (
              <label className="inline-flex items-center gap-2">
                <Checkbox checked={sameLetter} onCheckedChange={filter(setSameLetter)} />
                {t('sameLetter', { character: glyph.character })}
              </label>
            )}
            {page && page.total > 0 && (
              <span className="ml-auto tabular-nums text-muted-foreground" aria-live="polite">
                {t('range', {
                  from: page.offset + 1,
                  to: page.offset + page.results.length,
                  total: page.total,
                })}
              </span>
            )}
          </div>

          {!page ? (
            <p role="status" className="text-sm text-muted-foreground">
              {t('loading')}
            </p>
          ) : page.results.length === 0 ? (
            <p role="status" className="text-sm text-muted-foreground">
              {t('noResults')}
            </p>
          ) : (
            <SearchGrid
              results={page.results}
              resultType="graphs"
              isFetching={similar.isFetching}
            />
          )}

          {page && page.total > SIMILAR_GLYPHS_PAGE_SIZE && (
            <nav className="flex justify-between" aria-label={t('title')}>
              <Button
                variant="outline"
                disabled={offset === 0}
                onClick={() => setOffset(Math.max(0, offset - SIMILAR_GLYPHS_PAGE_SIZE))}
              >
                {t('previous')}
              </Button>
              <Button
                variant="outline"
                disabled={offset + SIMILAR_GLYPHS_PAGE_SIZE >= page.total}
                onClick={() => setOffset(offset + SIMILAR_GLYPHS_PAGE_SIZE)}
              >
                {t('next')}
              </Button>
            </nav>
          )}
        </>
      )}
    </div>
  );
}
