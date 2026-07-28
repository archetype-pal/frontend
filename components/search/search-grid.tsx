'use client';

import * as React from 'react';
import { IiifImage } from '@/components/ui/iiif-image';
import Link from 'next/link';
import type { GraphListItem, ImageListItem, ManuscriptListItem } from '@/types/search';
import type { ResultType } from '@/lib/search-types';
import { getIiifImageUrl } from '@/utils/iiif';
import { useIiifThumbnailUrl } from '@/hooks/use-iiif-thumbnail';
import { Highlight } from './highlight';
import { CollectionStar } from '@/components/collection/collection-star';
import { OpenLightboxButton } from '@/components/lightbox/open-lightbox-button';
import { getImageDetailUrl } from '@/lib/media-url';
import { GraphDetailLink } from '@/components/search/graph-detail-link';
import type { ThumbnailSize } from '@/components/search/thumbnail-size-control';

type GridItem = ImageListItem | GraphListItem | ManuscriptListItem;

export interface SearchGridProps {
  results?: GridItem[];
  resultType: ResultType;
  highlightKeyword?: string;
  isFetching?: boolean;
  thumbnailSize?: ThumbnailSize;
}

// Column counts per thumbnail size. 'medium' preserves the historical grid;
// 'small'/'large' add or remove columns to shrink/grow each cell. Full static
// class strings so Tailwind's JIT can see them.
const GRID_COLUMNS: Record<ThumbnailSize, string> = {
  small: 'grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10',
  medium: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6',
  large: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
};

type GridCard =
  | {
      kind: 'image';
      item: ImageListItem;
      detailUrl: string | null;
      displayText: string;
      formattedDisplayText?: string;
      imageUrl: string | null;
    }
  | {
      kind: 'graph';
      item: GraphListItem;
      detailUrl: string | null;
      displayText: string;
      formattedDisplayText?: string;
    }
  | {
      kind: 'manuscript';
      item: ManuscriptListItem;
      detailUrl: string;
      displayText: string;
      formattedDisplayText?: string;
      imageUrl: string | null;
    };

type MediaGridCardProps = {
  imageUrl: string | null;
  detailUrl?: string | null;
  displayText: string;
  formattedDisplayText?: string;
  highlightKeyword: string;
  graphItem?: GraphListItem;
  annotationCount?: number | null;
  loadingFallback?: string;
  item: ImageListItem | GraphListItem;
  itemType: 'image' | 'graph';
  eager?: boolean;
};

const SEARCH_EAGER_THUMBNAIL_COUNT = 6;

type CardLabelPart = { plain?: string | null; formatted?: string };

// Joins label segments, mirroring the join on the Meilisearch `_formatted`
// variants so keyword <mark>s survive; when no segment has a formatted
// variant, Highlight falls back to client-side keyword matching instead.
function composeCardLabel(parts: CardLabelPart[]): { text: string; formattedText?: string } {
  const present = parts.filter((part) => part.plain);
  const hasFormatted = present.some((part) => part.formatted !== undefined);
  return {
    text: present.map((part) => part.plain).join(', '),
    formattedText: hasFormatted
      ? present.map((part) => part.formatted ?? part.plain).join(', ')
      : undefined,
  };
}

export function toGridCard(resultType: ResultType, item: GridItem): GridCard | null {
  const formatted = (item as { _formatted?: Record<string, string | undefined> })._formatted ?? {};
  if (resultType === 'manuscripts') {
    const ms = item as ManuscriptListItem;
    return {
      kind: 'manuscript',
      item: ms,
      detailUrl: `/manuscripts/${ms.id}`,
      displayText: ms.shelfmark || 'Untitled',
      formattedDisplayText: formatted.shelfmark,
      imageUrl: ms.first_image_iiif
        ? getIiifImageUrl(ms.first_image_iiif, { thumbnail: true })
        : null,
    };
  }
  if (resultType === 'images') {
    const image = item as ImageListItem;
    // Repository abbreviation + shelfmark come pre-composed as display_label;
    // hits indexed before that field existed fall back to the bare shelfmark.
    const label = composeCardLabel([
      image.display_label
        ? { plain: image.display_label, formatted: formatted.display_label }
        : { plain: image.shelfmark, formatted: formatted.shelfmark },
      { plain: image.locus, formatted: formatted.locus },
    ]);
    return {
      kind: 'image',
      item: image,
      detailUrl: getImageDetailUrl(image),
      displayText: label.text || 'Untitled',
      formattedDisplayText: label.formattedText,
      imageUrl: image.image_iiif ? getIiifImageUrl(image.image_iiif, { thumbnail: true }) : null,
    };
  }
  if (resultType === 'graphs') {
    const graph = item as GraphListItem;
    const label = composeCardLabel([
      graph.display_label
        ? { plain: graph.display_label, formatted: formatted.display_label }
        : { plain: graph.shelfmark, formatted: formatted.shelfmark },
    ]);
    return {
      kind: 'graph',
      item: graph,
      detailUrl: null,
      displayText: label.text || 'Untitled',
      formattedDisplayText: label.formattedText,
    };
  }
  return null;
}

const MediaGridCard = React.memo(function MediaGridCard({
  imageUrl,
  detailUrl,
  displayText,
  formattedDisplayText,
  highlightKeyword,
  graphItem,
  annotationCount,
  loadingFallback = 'No Image',
  item,
  itemType,
  eager = false,
}: MediaGridCardProps) {
  const renderLink = (children: React.ReactNode, className: string) =>
    graphItem ? (
      <GraphDetailLink graph={graphItem} className={className}>
        {children}
      </GraphDetailLink>
    ) : (
      <Link href={detailUrl ?? '#'} className={className}>
        {children}
      </Link>
    );

  const image = (
    <IiifImage
      src={imageUrl ?? ''}
      alt={displayText}
      fill
      className="object-contain transition-transform duration-300 group-hover:scale-[1.04]"
      sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, (max-width: 1280px) 20vw, 16vw"
      loading={eager ? 'eager' : 'lazy'}
    />
  );

  // Only collectable when there is a renderable region image. A graph with no
  // IIIF source would otherwise be starred into a collection it can never render
  // (mirrors clauseToGraphCollectionItem's null-on-missing-source guard).
  const collectable = itemType !== 'graph' || !!item.image_iiif?.trim();

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-lg border border-border bg-card shadow-sm transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-md focus-within:border-accent/60">
      <div className="relative aspect-4/3 overflow-hidden bg-muted/30">
        {imageUrl ? (
          <>
            {renderLink(image, 'relative block h-full w-full')}
            <div className="pointer-events-none absolute inset-0 bg-foreground/0 transition-colors duration-200 group-hover:bg-foreground/[0.05]" />
          </>
        ) : (
          renderLink(
            <span className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
              {loadingFallback}
            </span>,
            'block h-full w-full'
          )
        )}
        <div className="absolute right-2 top-2 z-30 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <OpenLightboxButton
            item={item}
            variant="ghost"
            size="icon"
            className="h-7 w-7 bg-card/90 shadow-sm hover:bg-card"
          />
          {collectable && <CollectionStar itemId={item.id} itemType={itemType} item={item} />}
        </div>
      </div>
      <div className="border-t border-border/70 px-2.5 py-1.5">
        {renderLink(
          <span
            title={displayText}
            className="block truncate font-serif text-[13px] font-medium leading-snug text-foreground transition-colors group-hover:text-primary"
          >
            <Highlight
              text={displayText}
              keyword={highlightKeyword}
              formattedText={formattedDisplayText}
            />
          </span>,
          'block'
        )}
        {annotationCount != null && (
          <span className="mt-0.5 block text-[11px] tabular-nums text-muted-foreground">
            {annotationCount.toLocaleString()} annotation{annotationCount === 1 ? '' : 's'}
          </span>
        )}
      </div>
    </div>
  );
});

const GraphGridCard = React.memo(function GraphGridCard({
  item,
  displayText,
  formattedDisplayText,
  highlightKeyword,
  eager,
}: {
  item: GraphListItem;
  displayText: string;
  formattedDisplayText?: string;
  highlightKeyword: string;
  eager: boolean;
}) {
  const infoUrl = (item.image_iiif || '').trim();
  const imageUrl = useIiifThumbnailUrl(infoUrl, item.coordinates);

  return (
    <MediaGridCard
      imageUrl={imageUrl}
      displayText={displayText}
      formattedDisplayText={formattedDisplayText}
      highlightKeyword={highlightKeyword}
      graphItem={item}
      loadingFallback={infoUrl ? '…' : 'No Image'}
      item={item}
      itemType="graph"
      eager={eager}
    />
  );
});

const ManuscriptGridCard = React.memo(function ManuscriptGridCard({
  item,
  detailUrl,
  imageUrl,
  displayText,
  formattedDisplayText,
  highlightKeyword,
  eager,
}: {
  item: ManuscriptListItem;
  detailUrl: string;
  imageUrl: string | null;
  displayText: string;
  formattedDisplayText?: string;
  highlightKeyword: string;
  eager: boolean;
}) {
  const meta = [item.type, item.date].filter(Boolean).join(' · ');
  return (
    <div className="group relative flex flex-col overflow-hidden rounded-lg border border-border bg-card shadow-sm transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-md focus-within:border-accent/60">
      <div className="relative aspect-4/3 overflow-hidden bg-muted/30">
        <Link href={detailUrl} className="relative block h-full w-full">
          {imageUrl ? (
            <IiifImage
              src={imageUrl}
              alt={displayText}
              fill
              className="object-contain transition-transform duration-300 group-hover:scale-[1.04]"
              sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, (max-width: 1280px) 20vw, 16vw"
              loading={eager ? 'eager' : 'lazy'}
            />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
              No Image
            </span>
          )}
        </Link>
        {imageUrl && (
          <div className="pointer-events-none absolute inset-0 bg-foreground/0 transition-colors duration-200 group-hover:bg-foreground/[0.05]" />
        )}
      </div>
      <div className="border-t border-border/70 px-2.5 py-1.5">
        <Link href={detailUrl} className="block">
          <span className="block truncate font-serif text-[13px] font-medium leading-snug text-foreground transition-colors group-hover:text-primary">
            <Highlight
              text={displayText}
              keyword={highlightKeyword}
              formattedText={formattedDisplayText}
            />
          </span>
        </Link>
        <div className="mt-0.5 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
          <span className="truncate">{meta || '—'}</span>
          {item.number_of_images > 0 && (
            <span className="shrink-0 tabular-nums">
              {item.number_of_images} img{item.number_of_images !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>
    </div>
  );
});

function SearchGridComponent({
  results = [],
  resultType,
  highlightKeyword = '',
  isFetching = false,
  thumbnailSize = 'medium',
}: SearchGridProps) {
  const cards = React.useMemo(
    () => results.map((item) => ({ card: toGridCard(resultType, item) })),
    [results, resultType]
  );

  const renderCard = React.useCallback(
    (card: GridCard, index: number) => {
      const eager = index < SEARCH_EAGER_THUMBNAIL_COUNT;

      if (card.kind === 'manuscript') {
        return (
          <ManuscriptGridCard
            key={card.item.id}
            item={card.item}
            detailUrl={card.detailUrl}
            imageUrl={card.imageUrl}
            displayText={card.displayText}
            formattedDisplayText={card.formattedDisplayText}
            highlightKeyword={highlightKeyword}
            eager={eager}
          />
        );
      }

      if (card.kind === 'graph' && card.item.image_iiif) {
        return (
          <GraphGridCard
            key={card.item.id}
            item={card.item}
            displayText={card.displayText}
            formattedDisplayText={card.formattedDisplayText}
            highlightKeyword={highlightKeyword}
            eager={eager}
          />
        );
      }

      return (
        <MediaGridCard
          key={card.item.id}
          imageUrl={card.kind === 'image' ? card.imageUrl : null}
          detailUrl={card.detailUrl}
          displayText={card.displayText}
          formattedDisplayText={card.formattedDisplayText}
          highlightKeyword={highlightKeyword}
          graphItem={card.kind === 'graph' ? card.item : undefined}
          annotationCount={card.kind === 'image' ? card.item.number_of_annotations : null}
          item={card.item}
          itemType={card.kind}
          eager={eager}
        />
      );
    },
    [highlightKeyword]
  );

  if (!results.length) {
    return <div className="py-10 text-center text-muted-foreground">No results to display.</div>;
  }

  const flatCards = cards.map(({ card }) => card).filter((card): card is GridCard => card != null);

  return (
    <section
      className={`relative grid gap-3 ${GRID_COLUMNS[thumbnailSize]} ${
        isFetching ? 'opacity-60' : ''
      }`}
    >
      {flatCards.map((card, index) => renderCard(card, index))}
    </section>
  );
}

export const SearchGrid = React.memo(SearchGridComponent);
