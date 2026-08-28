'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { IiifImage } from '@/components/ui/iiif-image';
import Link from 'next/link';
import type {
  ClauseListItem,
  GraphListItem,
  ImageListItem,
  ManuscriptListItem,
} from '@/types/search';
import type { ResultType } from '@/lib/search-types';
import { getIiifImageUrl } from '@/utils/iiif';
import { useIiifThumbnailUrl } from '@/hooks/use-iiif-thumbnail';
import { Highlight } from './highlight';
import { CollectionStar } from '@/components/collection/collection-star';
import { Checkbox } from '@/components/ui/checkbox';
import { OpenLightboxButton } from '@/components/lightbox/open-lightbox-button';
import { getImageDetailUrl } from '@/lib/media-url';
import { GraphDetailLink } from '@/components/search/graph-detail-link';
import { clauseToGraphCollectionItem } from '@/lib/collection-item';
import { cn } from '@/lib/utils';
import type { ThumbnailSize } from '@/components/search/thumbnail-size-control';
import type { ManuscriptCompareSelection } from '@/hooks/search/use-manuscript-compare-selection';
import { cn } from '@/lib/utils';

type GridItem = ImageListItem | GraphListItem | ManuscriptListItem | ClauseListItem;

export interface SearchGridProps {
  results?: GridItem[];
  resultType: ResultType;
  highlightKeyword?: string;
  isFetching?: boolean;
  thumbnailSize?: ThumbnailSize;
  /** Only meaningful (and only passed) when `resultType === 'manuscripts'`. */
  manuscriptSelection?: ManuscriptCompareSelection;
  showThumbnails?: boolean;
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
    }
  | {
      kind: 'clause';
      item: ClauseListItem;
      detailUrl: string | null;
      displayText: string;
      formattedDisplayText?: string;
      content?: string;
      formattedContent?: string;
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
  showThumbnail?: boolean;
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
  if (resultType === 'clauses') {
    const clause = item as ClauseListItem;
    const label = composeCardLabel([
      { plain: clause.clause_type, formatted: formatted.clause_type },
      { plain: clause.shelfmark, formatted: formatted.shelfmark },
      { plain: clause.locus, formatted: formatted.locus },
    ]);
    return {
      kind: 'clause',
      item: clause,
      detailUrl: getImageDetailUrl(clause),
      displayText: label.text || 'Untitled',
      formattedDisplayText: label.formattedText,
      content: clause.content,
      formattedContent: formatted.content,
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
  showThumbnail = true,
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

  // Rendered over the thumbnail when there is one, in the footer when there
  // isn't: hiding thumbnails is a display preference, not a way to give up
  // collecting and lightboxing results.
  const actions = (
    <>
      <OpenLightboxButton
        item={item}
        variant="ghost"
        size="icon"
        className="h-7 w-7 bg-card/90 shadow-sm hover:bg-card"
      />
      {collectable && (
        <CollectionStar
          itemId={item.id}
          itemType={itemType}
          item={item}
          className={showThumbnail ? undefined : 'static'}
        />
      )}
    </>
  );

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-lg border border-border bg-card shadow-sm transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-md focus-within:border-accent/60">
      {showThumbnail && (
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
            {actions}
          </div>
        </div>
      )}
      <div
        className={cn(
          'flex items-center gap-2 px-2.5 py-1.5',
          showThumbnail && 'border-t border-border/70'
        )}
      >
        <div className="min-w-0 flex-1">
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
        {!showThumbnail && <div className="flex shrink-0 items-center gap-1">{actions}</div>}
      </div>
    </div>
  );
});

const GraphGridCard = React.memo(function GraphGridCard({
  item,
  displayText,
  formattedDisplayText,
  highlightKeyword,
  showThumbnail = true,
  eager,
}: {
  item: GraphListItem;
  displayText: string;
  formattedDisplayText?: string;
  highlightKeyword: string;
  showThumbnail?: boolean;
  eager: boolean;
}) {
  const infoUrl = (item.image_iiif || '').trim();
  // An empty info URL makes the hook a no-op. Text-only mode exists to avoid
  // image work, and a bounded crop costs a fetchIiifImageInfo round-trip per
  // distinct image — so don't ask for one nothing will render.
  const imageUrl = useIiifThumbnailUrl(showThumbnail ? infoUrl : '', item.coordinates);

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
      showThumbnail={showThumbnail}
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
  showThumbnail = true,
  eager,
  selection,
}: {
  item: ManuscriptListItem;
  detailUrl: string;
  imageUrl: string | null;
  displayText: string;
  formattedDisplayText?: string;
  highlightKeyword: string;
  showThumbnail?: boolean;
  eager: boolean;
  selection?: ManuscriptCompareSelection;
}) {
  const t = useTranslations('search');
  const meta = [item.type, item.date].filter(Boolean).join(' · ');
  const isChecked = selection?.isSelected(item.id) ?? false;
  return (
    <div className="group relative flex flex-col overflow-hidden rounded-lg border border-border bg-card shadow-sm transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-md focus-within:border-accent/60">
        {showThumbnail && (
          <div className="relative aspect-4/3 overflow-hidden bg-muted/30">
            {selection && (
              <Checkbox
                checked={isChecked}
                disabled={selection.isDisabled(item.id)}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onCheckedChange={() => selection.toggle(item.id)}
                aria-label={t('compareAction.selectAriaLabel', { label: displayText })}
                className={cn(
                  'absolute left-2 top-2 z-20 border-border bg-background/90 shadow-sm transition-opacity duration-200',
                  isChecked ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                )}
              />
            )}
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
        )}
      <div className={cn('px-2.5 py-1.5', showThumbnail && 'border-t border-border/70')}>
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

const ClauseGridCard = React.memo(function ClauseGridCard({
  item,
  detailUrl,
  displayText,
  formattedDisplayText,
  content,
  formattedContent,
  highlightKeyword,
  showThumbnail = true,
  eager = false,
}: {
  item: ClauseListItem;
  detailUrl: string | null;
  displayText: string;
  formattedDisplayText?: string;
  content?: string;
  formattedContent?: string;
  highlightKeyword: string;
  showThumbnail?: boolean;
  eager?: boolean;
}) {
  const infoUrl = (item.thumbnail_iiif || '').trim();
  // See MediaGridCard: no thumbnail rendered, no IIIF info fetch.
  const imageUrl = useIiifThumbnailUrl(showThumbnail ? infoUrl : '', item.annotation_coordinates);
  const collectionItem = React.useMemo(() => clauseToGraphCollectionItem(item), [item]);
  const meta = [item.date, item.repository_name].filter(Boolean).join(' · ');

  const actions = collectionItem && (
    <>
      <OpenLightboxButton
        item={collectionItem}
        variant="ghost"
        size="icon"
        className="h-7 w-7 bg-card/90 shadow-sm hover:bg-card"
      />
      <CollectionStar
        itemId={collectionItem.id}
        itemType="graph"
        item={collectionItem}
        className={showThumbnail ? undefined : 'static'}
      />
    </>
  );

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-lg border border-border bg-card shadow-sm transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-md focus-within:border-accent/60">
      {showThumbnail && (
        <div className="relative aspect-4/3 overflow-hidden bg-muted/30">
          {imageUrl ? (
            <Link href={detailUrl ?? '#'} className="relative block h-full w-full">
              <IiifImage
                src={imageUrl}
                alt={displayText}
                fill
                className="object-contain transition-transform duration-300 group-hover:scale-[1.04]"
                sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, (max-width: 1280px) 20vw, 16vw"
                loading={eager ? 'eager' : 'lazy'}
              />
              <div className="pointer-events-none absolute inset-0 bg-foreground/0 transition-colors duration-200 group-hover:bg-foreground/[0.05]" />
            </Link>
          ) : (
            <Link href={detailUrl ?? '#'} className="block h-full w-full">
              <span className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                {infoUrl ? '…' : 'No Image'}
              </span>
            </Link>
          )}
          <div className="absolute right-2 top-2 z-30 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            {actions}
          </div>
        </div>
      )}
      <div
        className={cn(
          'flex flex-1 flex-col px-2.5 py-2',
          showThumbnail && 'border-t border-border/70'
        )}
      >
        <div className="flex items-start gap-2">
          <Link href={detailUrl ?? '#'} className="block min-w-0 flex-1">
            <span
              title={displayText}
              className="block truncate font-serif text-[13px] font-medium leading-snug text-foreground transition-colors group-hover:text-primary"
            >
              <Highlight
                text={displayText}
                keyword={highlightKeyword}
                formattedText={formattedDisplayText}
              />
            </span>
          </Link>
          {!showThumbnail && actions && (
            <div className="flex shrink-0 items-center gap-1">{actions}</div>
          )}
        </div>
        {content && (
          <p className="mt-1 line-clamp-3 font-serif text-xs italic leading-relaxed text-muted-foreground">
            <Highlight text={content} keyword={highlightKeyword} formattedText={formattedContent} />
          </p>
        )}
        {meta && (
          <div className="mt-auto pt-2 text-[11px] text-muted-foreground/80">
            <span className="truncate">{meta}</span>
          </div>
        )}
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
  manuscriptSelection,
  showThumbnails = true,
}: SearchGridProps) {
  const cards = React.useMemo(
    () => results.map((item) => ({ card: toGridCard(resultType, item) })),
    [results, resultType]
  );

  const renderCard = React.useCallback(
    (card: GridCard, index: number) => {
      const eager = index < SEARCH_EAGER_THUMBNAIL_COUNT;

      if (card.kind === 'clause') {
        return (
          <ClauseGridCard
            key={card.item.id}
            item={card.item}
            detailUrl={card.detailUrl}
            displayText={card.displayText}
            formattedDisplayText={card.formattedDisplayText}
            content={card.content}
            formattedContent={card.formattedContent}
            highlightKeyword={highlightKeyword}
            showThumbnail={showThumbnails}
            eager={eager}
          />
        );
      }

      if (card.kind === 'manuscript') {
        return (
          <ManuscriptGridCard
            key={card.item.id}
            item={card.item}
            selection={manuscriptSelection}
            detailUrl={card.detailUrl}
            imageUrl={card.imageUrl}
            displayText={card.displayText}
            formattedDisplayText={card.formattedDisplayText}
            highlightKeyword={highlightKeyword}
            showThumbnail={showThumbnails}
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
            showThumbnail={showThumbnails}
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
          showThumbnail={showThumbnails}
          eager={eager}
        />
      );
    },
    [highlightKeyword, showThumbnails, manuscriptSelection]
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
