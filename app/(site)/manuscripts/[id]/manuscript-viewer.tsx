'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowUpRight, BookOpen } from 'lucide-react';

import type { Manuscript, ManuscriptImage } from '@/types/manuscript';
import { getIiifImageUrl, type IIIFImageUrlOptions } from '@/utils/iiif';
import { useModelLabels } from '@/contexts/model-labels-context';
import { BackofficeLink } from '@/components/common/backoffice-link';
import { ImageTextViewer } from '@/components/text/image-text-viewer';
import { sanitizeHtml } from '@/lib/sanitize-html';
import { Button } from '@/components/ui/button';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { cn } from '@/lib/utils';

interface ManuscriptViewerProps {
  manuscript: Manuscript;
  images: ManuscriptImage[];
}

/* ── Helpers ──────────────────────────────────────────────────────────── */

// Route IIIF requests through the Next rewrite proxy so the browser never
// talks to the image server directly (matches the rest of the site).
function toIiifProxyUrl(url: string): string {
  try {
    const u = new URL(url);
    return `/iiif-proxy${u.pathname}${u.search}`;
  } catch {
    return url;
  }
}

function imageSrc(raw: string | undefined, options: IIIFImageUrlOptions): string {
  if (!raw) return '/placeholder.svg';
  return toIiifProxyUrl(getIiifImageUrl(raw, options));
}

function annotationCount(image: ManuscriptImage): number {
  return image.number_of_image_annotations ?? image.number_of_annotations ?? 0;
}

function textOfType(image: ManuscriptImage, type: string): string | undefined {
  return image.texts?.find((t) => t.type?.toLowerCase() === type && t.content?.trim())?.content;
}

// Order the plates the way a charter is read: face, then dorse, then seals.
const LOCUS_RANK: Record<string, number> = {
  face: 0,
  recto: 0,
  front: 0,
  dorse: 1,
  verso: 1,
  back: 1,
  seal: 2,
};

function locusRank(locus: string | undefined): number {
  return LOCUS_RANK[(locus ?? '').toLowerCase()] ?? 3;
}

function nonEmpty(value: string | null | undefined): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/* ── Small presentational pieces ──────────────────────────────────────── */

function SectionHeading({ title, aside }: { title: string; aside?: React.ReactNode }) {
  return (
    <div className="mb-8 flex items-center gap-5">
      <h2 className="font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
        {title}
      </h2>
      <span
        aria-hidden
        className="h-px flex-1 bg-gradient-to-r from-border via-border/50 to-transparent"
      />
      {aside ? (
        <span className="hidden whitespace-nowrap text-xs uppercase tracking-[0.18em] text-muted-foreground sm:inline">
          {aside}
        </span>
      ) : null}
    </div>
  );
}

function Stat({ value, label }: { value: number | string; label: string }) {
  return (
    <div>
      <div className="font-display text-3xl font-semibold leading-none tabular-nums text-primary">
        {value}
      </div>
      <div className="mt-1.5 text-xs uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </div>
    </div>
  );
}

function DetailRow({ term, children }: { term: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[minmax(7rem,9rem)_1fr] gap-x-4 py-3">
      <dt className="pt-0.5 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {term}
      </dt>
      <dd className="font-serif text-foreground">{children}</dd>
    </div>
  );
}

/* ── Plate (image) card ───────────────────────────────────────────────── */

function PlateCard({ image, manuscriptId }: { image: ManuscriptImage; manuscriptId: number }) {
  const count = annotationCount(image);
  const transcribed = Boolean(textOfType(image, 'transcription'));
  return (
    <li>
      <Link
        href={`/manuscripts/${manuscriptId}/images/${image.id}`}
        className="group block focus-visible:outline-none"
      >
        <div className="relative overflow-hidden rounded-md border border-border bg-card p-2 shadow-sm transition-all duration-300 group-hover:-translate-y-1 group-hover:border-accent/60 group-hover:shadow-md group-focus-visible:ring-2 group-focus-visible:ring-ring">
          <div className="relative aspect-square overflow-hidden rounded-sm bg-muted">
            <Image
              src={imageSrc(image.iiif_image, { maxSize: 700 })}
              alt={image.locus ? `${image.locus} of manuscript` : 'Manuscript image'}
              fill
              sizes="(min-width: 1024px) 24vw, (min-width: 640px) 33vw, 50vw"
              className="object-contain transition-transform duration-500 group-hover:scale-[1.03]"
              unoptimized
            />
          </div>
          {transcribed ? (
            <span className="absolute left-3 top-3 rounded-full bg-primary/90 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-primary-foreground backdrop-blur">
              Transcribed
            </span>
          ) : null}
        </div>
        <div className="mt-2.5 flex items-baseline justify-between gap-2 px-0.5">
          <span className="font-serif text-sm capitalize text-foreground transition-colors group-hover:text-primary">
            {image.locus || 'Image'}
          </span>
          {count > 0 ? (
            <span className="text-xs tabular-nums text-muted-foreground">
              {count} {count === 1 ? 'annotation' : 'annotations'}
            </span>
          ) : null}
        </div>
      </Link>
    </li>
  );
}

/* ── Main component ───────────────────────────────────────────────────── */

export function ManuscriptViewer({ manuscript, images }: ManuscriptViewerProps) {
  const { getLabel, getPluralLabel } = useModelLabels();

  const { historical_item: historical, current_item: current } = manuscript;
  const title = manuscript.display_label?.trim() || `Manuscript #${manuscript.id}`;
  const repository = current.repository;

  const orderedImages = React.useMemo(
    () => [...images].sort((a, b) => locusRank(a.locus) - locusRank(b.locus)),
    [images]
  );

  // Featured plate: prefer the text-bearing leaf, then the most-annotated, then first.
  const featured = React.useMemo(() => {
    return (
      orderedImages.find((img) => textOfType(img, 'transcription')) ??
      orderedImages.find((img) => annotationCount(img) > 0) ??
      orderedImages[0]
    );
  }, [orderedImages]);

  // Leaves that carry an edition (transcription and/or translation).
  const editions = React.useMemo(
    () =>
      orderedImages
        .map((img) => ({
          image: img,
          transcription: textOfType(img, 'transcription'),
          translation: textOfType(img, 'translation'),
        }))
        .filter((e) => e.transcription || e.translation),
    [orderedImages]
  );

  const descriptions = historical.descriptions ?? [];
  const catalogueNumbers = historical.catalogue_numbers ?? [];
  const totalAnnotations = orderedImages.reduce((sum, img) => sum + annotationCount(img), 0);

  // Section anchors — only advertise the ones that actually render.
  const sections = [
    descriptions.length > 0 && { id: 'description', label: 'Description' },
    editions.length > 0 && { id: 'text', label: 'Text' },
    orderedImages.length > 0 && { id: 'images', label: 'Images' },
    { id: 'record', label: 'Record' },
  ].filter(Boolean) as { id: string; label: string }[];

  return (
    <main className="mx-auto max-w-6xl px-4 pb-24 pt-6 sm:px-6">
      <Breadcrumb className="animate-fade-up">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/">Home</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/search/manuscripts">{getLabel('appManuscripts')}</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{title}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <header className="mt-6 grid items-end gap-10 lg:mt-8 lg:grid-cols-[1fr_minmax(0,40%)] lg:gap-14">
        <div className="animate-fade-up">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold uppercase tracking-[0.2em]">
            {nonEmpty(historical.type) ? (
              <span className="text-accent">{historical.type}</span>
            ) : null}
            {nonEmpty(historical.type) && nonEmpty(repository.label) ? (
              <span aria-hidden className="h-1 w-1 rounded-full bg-border" />
            ) : null}
            {nonEmpty(repository.label) ? (
              <span className="text-muted-foreground">{repository.label}</span>
            ) : null}
          </div>

          <h1 className="mt-4 font-display text-5xl font-semibold leading-[0.95] tracking-tight text-foreground sm:text-6xl">
            {title}
          </h1>

          {nonEmpty(historical.date_display) ? (
            <p className="mt-4 font-serif text-xl italic text-primary">{historical.date_display}</p>
          ) : null}

          <p className="mt-2 font-serif text-base text-muted-foreground">
            {repository.name}
            {nonEmpty(repository.place) ? <span>, {repository.place}</span> : null}
          </p>

          <dl className="mt-8 flex flex-wrap gap-x-10 gap-y-5">
            {orderedImages.length > 0 ? <Stat value={orderedImages.length} label="Images" /> : null}
            {totalAnnotations > 0 ? (
              <Stat value={totalAnnotations.toLocaleString()} label="Annotations" />
            ) : null}
            {catalogueNumbers.length > 0 ? (
              <Stat value={catalogueNumbers.length} label="References" />
            ) : null}
          </dl>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            {featured ? (
              <Button asChild size="lg">
                <Link href={`/manuscripts/${manuscript.id}/images/${featured.id}`}>
                  <BookOpen className="mr-2 h-4 w-4" />
                  Open image viewer
                </Link>
              </Button>
            ) : null}
            <BackofficeLink kind="item-part" id={manuscript.id} />
          </div>

          {sections.length > 1 ? (
            <nav
              aria-label="On this page"
              className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-border pt-5"
            >
              {sections.map((section) => (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  className="text-sm text-muted-foreground decoration-accent/60 underline-offset-4 transition-colors hover:text-primary hover:underline"
                >
                  {section.label}
                </a>
              ))}
            </nav>
          ) : null}
        </div>

        {featured ? (
          <figure className="animate-fade-up delay-200">
            <Link
              href={`/manuscripts/${manuscript.id}/images/${featured.id}`}
              className="group block focus-visible:outline-none"
              aria-label={`Open ${featured.locus || 'image'} in the viewer`}
            >
              <div className="relative overflow-hidden rounded-lg border border-border bg-card p-2.5 shadow-sm transition-all duration-300 group-hover:-translate-y-0.5 group-hover:shadow-lg group-focus-visible:ring-2 group-focus-visible:ring-ring">
                <div className="relative aspect-[4/3] overflow-hidden rounded-md bg-muted">
                  <Image
                    src={imageSrc(featured.iiif_image, { maxSize: 1400 })}
                    alt={featured.locus ? `${featured.locus} of ${title}` : title}
                    fill
                    sizes="(min-width: 1024px) 40vw, 100vw"
                    className="object-contain transition-transform duration-500 group-hover:scale-[1.02]"
                    unoptimized
                    priority
                  />
                </div>
                <div className="pointer-events-none absolute inset-2.5 flex items-end rounded-md bg-gradient-to-t from-foreground/55 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                  <span className="m-3 inline-flex items-center gap-1.5 rounded-full bg-background/90 px-3 py-1 text-xs font-medium text-foreground backdrop-blur">
                    Open image <ArrowUpRight className="h-3.5 w-3.5" />
                  </span>
                </div>
              </div>
            </Link>
            <figcaption className="mt-3 flex items-baseline justify-between gap-2 px-1 text-sm">
              <span className="font-serif capitalize text-foreground">
                {featured.locus || 'Image'}
              </span>
              {annotationCount(featured) > 0 ? (
                <span className="text-muted-foreground">
                  {annotationCount(featured)} annotations
                </span>
              ) : null}
            </figcaption>
          </figure>
        ) : null}
      </header>

      {/* ── Description ───────────────────────────────────────────────── */}
      {descriptions.length > 0 ? (
        <section id="description" className="mt-20 scroll-mt-24">
          <SectionHeading title="Description" />
          <div className="max-w-3xl space-y-10">
            {descriptions.map((desc, index) => (
              <article key={index}>
                {/* Descriptions are authored as HTML (paragraphs, italics, entities),
                    so sanitize and render rather than printing the raw markup. */}
                <div
                  className={cn(
                    'font-serif text-lg leading-relaxed text-foreground',
                    '[&_p]:m-0 [&_p+p]:mt-4',
                    '[&_a]:text-primary [&_a]:underline-offset-4 [&_a:hover]:underline',
                    index === 0 && 'drop-cap'
                  )}
                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(desc.content) }}
                />
                {nonEmpty(desc.source?.name) ? (
                  <p className="mt-4 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                    From {desc.source.name}
                  </p>
                ) : null}
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {/* ── Text: facing-page edition ─────────────────────────────────── */}
      {editions.length > 0 ? (
        <section id="text" className="mt-20 scroll-mt-24">
          <SectionHeading title="Text" aside="Latin & English" />
          <div className="space-y-14">
            {editions.map((edition) => {
              const hasBoth = Boolean(edition.transcription && edition.translation);
              return (
                <div key={edition.image.id}>
                  {editions.length > 1 ? (
                    <p className="mb-5 text-xs font-semibold uppercase tracking-[0.18em] text-accent">
                      {edition.image.locus || 'Leaf'}
                    </p>
                  ) : null}
                  <div className={cn('grid gap-10', hasBoth && 'lg:grid-cols-2 lg:gap-14')}>
                    {edition.transcription ? (
                      <div>
                        <h3 className="mb-4 flex items-baseline gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                          Transcription
                          <span className="font-normal normal-case tracking-normal text-muted-foreground/70">
                            Latin
                          </span>
                        </h3>
                        <ImageTextViewer
                          html={edition.transcription}
                          className="prose prose-sm max-w-none leading-loose text-foreground [&_p]:my-0"
                        />
                      </div>
                    ) : null}
                    {edition.translation ? (
                      <div className={cn(hasBoth && 'lg:border-l lg:border-border lg:pl-14')}>
                        <h3 className="mb-4 flex items-baseline gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                          Translation
                          <span className="font-normal normal-case tracking-normal text-muted-foreground/70">
                            English
                          </span>
                        </h3>
                        <ImageTextViewer
                          html={edition.translation}
                          className="prose prose-sm max-w-none leading-loose text-foreground/90 [&_p]:my-0"
                        />
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      {/* ── Images: plate gallery ─────────────────────────────────────── */}
      {orderedImages.length > 0 ? (
        <section id="images" className="mt-20 scroll-mt-24">
          <SectionHeading
            title="Images"
            aside={`${orderedImages.length} ${orderedImages.length === 1 ? 'plate' : 'plates'}`}
          />
          <ul className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
            {orderedImages.map((image) => (
              <PlateCard key={image.id} image={image} manuscriptId={manuscript.id} />
            ))}
          </ul>
        </section>
      ) : null}

      {/* ── Record: archival metadata ─────────────────────────────────── */}
      <section id="record" className="mt-20 scroll-mt-24">
        <SectionHeading title="Catalogue record" aside={current.shelfmark} />
        <div className="grid gap-x-14 gap-y-10 lg:grid-cols-[1.1fr_0.9fr]">
          <dl className="divide-y divide-border">
            <DetailRow term="Repository">
              {nonEmpty(repository.url) ? (
                <Link
                  href={repository.url}
                  className="text-primary underline-offset-4 hover:underline"
                >
                  {repository.name}
                </Link>
              ) : (
                repository.name
              )}
            </DetailRow>
            {nonEmpty(repository.place) ? (
              <DetailRow term="Location">{repository.place}</DetailRow>
            ) : null}
            {nonEmpty(current.shelfmark) ? (
              <DetailRow term={getLabel('fieldShelfmark')}>{current.shelfmark}</DetailRow>
            ) : null}
            {nonEmpty(historical.type) ? (
              <DetailRow term="Type">{historical.type}</DetailRow>
            ) : null}
            {nonEmpty(historical.date_display) ? (
              <DetailRow term="Date">{historical.date_display}</DetailRow>
            ) : null}
            {nonEmpty(historical.format) ? (
              <DetailRow term="Format">{historical.format}</DetailRow>
            ) : null}
            {nonEmpty(historical.probable_text_date) ? (
              <DetailRow term="Probable date">{historical.probable_text_date}</DetailRow>
            ) : null}
            {nonEmpty(historical.dating_notes) ? (
              <DetailRow term="Dating notes">{historical.dating_notes}</DetailRow>
            ) : null}
          </dl>

          {catalogueNumbers.length > 0 ? (
            <div>
              <h3 className="mb-5 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                {getPluralLabel('catalogueNumber')}
              </h3>
              <ul className="divide-y divide-border">
                {catalogueNumbers.map((cat, index) => {
                  const body = (
                    <>
                      <span className="font-serif text-foreground">{cat.number}</span>
                      {nonEmpty(cat.catalogue?.name) ? (
                        <span className="mt-0.5 block text-xs uppercase tracking-[0.12em] text-muted-foreground">
                          {cat.catalogue.name}
                        </span>
                      ) : null}
                    </>
                  );
                  return (
                    <li key={index} className="py-3 first:pt-0">
                      {nonEmpty(cat.url) ? (
                        <Link
                          href={cat.url}
                          className="group flex items-baseline justify-between gap-3"
                        >
                          <span className="transition-colors group-hover:text-primary">{body}</span>
                          <ArrowUpRight className="h-4 w-4 shrink-0 translate-y-0.5 text-muted-foreground transition-colors group-hover:text-primary" />
                        </Link>
                      ) : (
                        <div>{body}</div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}
