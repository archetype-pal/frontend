'use client';

import * as React from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
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

type GridItem = ImageListItem | GraphListItem | ManuscriptListItem;

export interface SearchGridProps {
  results?: GridItem[];
  resultType: ResultType;
  highlightKeyword?: string;
  scrollContainerRef?: React.RefObject<HTMLElement | null>;
  isFetching?: boolean;
  compareSelection?: Array<string | number>;
  onToggleCompare?: (id: string | number) => void;
}

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
};

function toGridCard(resultType: ResultType, item: GridItem): GridCard | null {
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
    return {
      kind: 'image',
      item: image,
      detailUrl: getImageDetailUrl(image),
      displayText: image.locus || 'Untitled',
      formattedDisplayText: formatted.locus,
      imageUrl: image.image_iiif ? getIiifImageUrl(image.image_iiif, { thumbnail: true }) : null,
    };
  }
  if (resultType === 'graphs') {
    const graph = item as GraphListItem;
    return {
      kind: 'graph',
      item: graph,
      detailUrl: null,
      displayText: graph.shelfmark || 'Untitled',
      formattedDisplayText: formatted.shelfmark,
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
    />
  );

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-lg border border-border bg-card shadow-sm transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-md focus-within:border-accent/60">
      <div className="relative aspect-4/3 overflow-hidden bg-muted/30">
        {imageUrl ? (
          <>
            {renderLink(image, 'block h-full w-full')}
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
          <CollectionStar itemId={item.id} itemType={itemType} item={item} />
        </div>
      </div>
      <div className="border-t border-border/70 px-2.5 py-1.5">
        {renderLink(
          <span className="block truncate font-serif text-[13px] font-medium leading-snug text-foreground transition-colors group-hover:text-primary">
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
}: {
  item: GraphListItem;
  displayText: string;
  formattedDisplayText?: string;
  highlightKeyword: string;
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
}: {
  item: ManuscriptListItem;
  detailUrl: string;
  imageUrl: string | null;
  displayText: string;
  formattedDisplayText?: string;
  highlightKeyword: string;
}) {
  const meta = [item.type, item.date].filter(Boolean).join(' · ');
  return (
    <div className="group relative flex flex-col overflow-hidden rounded-lg border border-border bg-card shadow-sm transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-md focus-within:border-accent/60">
      <div className="relative aspect-4/3 overflow-hidden bg-muted/30">
        <Link href={detailUrl} className="block h-full w-full">
          {imageUrl ? (
            <IiifImage
              src={imageUrl}
              alt={displayText}
              fill
              className="object-contain transition-transform duration-300 group-hover:scale-[1.04]"
              sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, (max-width: 1280px) 20vw, 16vw"
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

function columnsForWidth(width: number): number {
  if (width < 640) return 2;
  if (width < 768) return 3;
  if (width < 1024) return 4;
  if (width < 1280) return 5;
  return 6;
}

function SearchGridComponent({
  results = [],
  resultType,
  highlightKeyword = '',
  scrollContainerRef,
  isFetching = false,
  compareSelection = [],
  onToggleCompare,
}: SearchGridProps) {
  const layoutRef = React.useRef<HTMLDivElement | null>(null);
  const [layoutWidth, setLayoutWidth] = React.useState(1280);
  const cards = React.useMemo(
    () => results.map((item) => ({ card: toGridCard(resultType, item) })),
    [results, resultType]
  );
  const columnCount = React.useMemo(() => columnsForWidth(layoutWidth), [layoutWidth]);
  const rowCount = React.useMemo(
    () => Math.ceil(cards.filter(({ card }) => card != null).length / columnCount),
    [cards, columnCount]
  );
  const shouldVirtualize = !!scrollContainerRef && cards.length > 80;
  // eslint-disable-next-line react-hooks/incompatible-library
  const rowVirtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => scrollContainerRef?.current ?? null,
    estimateSize: () => 260,
    overscan: 3,
  });

  React.useEffect(() => {
    const el = layoutRef.current;
    if (!el) return;
    setLayoutWidth(el.getBoundingClientRect().width || 1280);
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width;
      if (typeof width === 'number' && width > 0) {
        setLayoutWidth(width);
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const renderCard = React.useCallback(
    (card: GridCard) => {
      const canCompare = resultType === 'manuscripts' || resultType === 'graphs';
      const compareControl = canCompare ? (
        <label className="absolute left-2 top-2 z-30 inline-flex items-center gap-1 rounded bg-card/90 px-1.5 py-0.5 text-[10px] shadow-sm">
          <input
            type="checkbox"
            checked={compareSelection.map(String).includes(String(card.item.id))}
            onChange={() => onToggleCompare?.(card.item.id)}
          />
          Cmp
        </label>
      ) : null;
      if (card.kind === 'manuscript') {
        return (
          <div key={card.item.id} className="relative">
            {compareControl}
            <ManuscriptGridCard
              item={card.item}
              detailUrl={card.detailUrl}
              imageUrl={card.imageUrl}
              displayText={card.displayText}
              formattedDisplayText={card.formattedDisplayText}
              highlightKeyword={highlightKeyword}
            />
          </div>
        );
      }

      if (card.kind === 'graph' && card.item.image_iiif) {
        return (
          <div key={card.item.id} className="relative">
            {compareControl}
            <GraphGridCard
              item={card.item}
              displayText={card.displayText}
              formattedDisplayText={card.formattedDisplayText}
              highlightKeyword={highlightKeyword}
            />
          </div>
        );
      }

      return (
        <div key={card.item.id} className="relative">
          {compareControl}
          <MediaGridCard
            imageUrl={card.kind === 'image' ? card.imageUrl : null}
            detailUrl={card.detailUrl}
            displayText={card.displayText}
            formattedDisplayText={card.formattedDisplayText}
            highlightKeyword={highlightKeyword}
            graphItem={card.kind === 'graph' ? card.item : undefined}
            annotationCount={card.kind === 'image' ? card.item.number_of_annotations : null}
            item={card.item}
            itemType={card.kind}
          />
        </div>
      );
    },
    [compareSelection, highlightKeyword, onToggleCompare, resultType]
  );

  if (!results.length) {
    return <div className="py-10 text-center text-muted-foreground">No results to display.</div>;
  }

  const flatCards = cards.map(({ card }) => card).filter((card): card is GridCard => card != null);

  if (!shouldVirtualize) {
    return (
      <section
        ref={layoutRef}
        className={`relative grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 ${
          isFetching ? 'opacity-60' : ''
        }`}
      >
        {flatCards.map((card) => renderCard(card))}
      </section>
    );
  }

  return (
    <section ref={layoutRef} className={`relative ${isFetching ? 'opacity-60' : ''}`}>
      <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: 'relative' }}>
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const start = virtualRow.index * columnCount;
          const rowCards = flatCards.slice(start, start + columnCount);
          if (rowCards.length === 0) return null;
          return (
            <div
              key={virtualRow.key}
              className="absolute left-0 w-full grid gap-3"
              style={{
                transform: `translateY(${virtualRow.start}px)`,
                gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))`,
              }}
            >
              {rowCards.map((card) => renderCard(card))}
            </div>
          );
        })}
      </div>
    </section>
  );
}

export const SearchGrid = React.memo(SearchGridComponent);
