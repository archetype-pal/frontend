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
  return (
    <div className="relative overflow-hidden group">
      <div className="relative aspect-4/3 bg-white overflow-hidden">
        {imageUrl ? (
          <>
            {graphItem ? (
              <GraphDetailLink
                graph={graphItem}
                className="block w-full h-full relative z-0 pointer-events-auto"
              >
                <IiifImage
                  src={imageUrl}
                  alt={displayText}
                  fill
                  className="object-contain transition-transform duration-300 group-hover:scale-105"
                  sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, (max-width: 1280px) 20vw, 16vw"
                />
              </GraphDetailLink>
            ) : (
              <Link
                href={detailUrl ?? '#'}
                className="block w-full h-full relative z-0 pointer-events-auto"
              >
                <IiifImage
                  src={imageUrl}
                  alt={displayText}
                  fill
                  className="object-contain transition-transform duration-300 group-hover:scale-105"
                  sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, (max-width: 1280px) 20vw, 16vw"
                />
              </Link>
            )}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-200 pointer-events-none z-10" />
            <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-20">
              <div className="font-medium truncate text-xs">
                <Highlight
                  text={displayText}
                  keyword={highlightKeyword}
                  formattedText={formattedDisplayText}
                />
              </div>
              {annotationCount != null && (
                <div className="text-xs text-white/80 mt-0.5">
                  <Highlight text={`${annotationCount} Annotations`} keyword={highlightKeyword} />
                </div>
              )}
            </div>
          </>
        ) : graphItem ? (
          <GraphDetailLink
            graph={graphItem}
            className="bg-gray-100 w-full h-full flex items-center justify-center text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            {loadingFallback}
          </GraphDetailLink>
        ) : (
          <div className="bg-gray-100 w-full h-full flex items-center justify-center text-sm text-gray-400">
            {loadingFallback}
          </div>
        )}
        <div className="absolute top-2 right-2 z-30 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <OpenLightboxButton
            item={item}
            variant="ghost"
            size="icon"
            className="bg-white/90 hover:bg-white h-7 w-7"
          />
          <CollectionStar itemId={item.id} itemType={itemType} item={item} />
        </div>
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
  return (
    <div className="relative overflow-hidden group">
      <div className="relative aspect-4/3 bg-white overflow-hidden">
        <Link href={detailUrl} className="block w-full h-full relative z-0">
          {imageUrl ? (
            <IiifImage
              src={imageUrl}
              alt={displayText}
              fill
              className="object-contain transition-transform duration-300 group-hover:scale-105"
              sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, (max-width: 1280px) 20vw, 16vw"
            />
          ) : (
            <div className="bg-gray-100 w-full h-full flex items-center justify-center text-sm text-gray-400">
              No Image
            </div>
          )}
        </Link>
        {imageUrl && (
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-200 pointer-events-none z-10" />
        )}
        <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-20">
          <div className="font-medium truncate text-xs">
            <Highlight
              text={displayText}
              keyword={highlightKeyword}
              formattedText={formattedDisplayText}
            />
          </div>
          <div className="text-xs text-white/80 mt-0.5 truncate">
            {[item.type, item.date].filter(Boolean).join(' · ') || '—'}
          </div>
          {item.number_of_images > 0 && (
            <div className="text-xs text-white/60 mt-0.5">
              {item.number_of_images} image{item.number_of_images !== 1 ? 's' : ''}
            </div>
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
        <label className="absolute top-2 left-2 z-30 inline-flex items-center gap-1 rounded bg-white/90 px-1.5 py-0.5 text-[10px]">
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
    return <div className="text-center text-gray-500 py-10">No results to display.</div>;
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
