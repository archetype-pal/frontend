'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { GraphListItem, ImageListItem } from '@/types/search';
import type { ResultType } from '@/lib/search-types';
import { getIiifImageUrl } from '@/utils/iiif';
import { useIiifThumbnailUrl } from '@/hooks/use-iiif-thumbnail';
import { Highlight } from './highlight';
import { CollectionStar } from '@/components/collection/collection-star';
import { OpenLightboxButton } from '@/components/lightbox/open-lightbox-button';
import { getImageDetailUrl, getGraphDetailUrl, resolveAndPushGraphDetail } from '@/lib/media-url';

export interface SearchGridProps {
  results?: (ImageListItem | GraphListItem)[];
  resultType: ResultType;
  highlightKeyword?: string;
}

type GridCard =
  | {
      kind: 'image';
      item: ImageListItem;
      detailUrl: string;
      displayText: string;
      imageUrl: string | null;
    }
  | { kind: 'graph'; item: GraphListItem; detailUrl: string; displayText: string };

type MediaGridCardProps = {
  imageUrl: string | null;
  detailUrl: string;
  displayText: string;
  highlightKeyword: string;
  onLinkClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
  annotationCount?: number | null;
  loadingFallback?: string;
  item: ImageListItem | GraphListItem;
  itemType: 'image' | 'graph';
};

function toGridCard(resultType: ResultType, item: ImageListItem | GraphListItem): GridCard | null {
  if (resultType === 'images') {
    const image = item as ImageListItem;
    return {
      kind: 'image',
      item: image,
      detailUrl: getImageDetailUrl(image),
      displayText: image.locus || 'Untitled',
      imageUrl: image.image_iiif ? getIiifImageUrl(image.image_iiif, { thumbnail: true }) : null,
    };
  }
  if (resultType === 'graphs') {
    const graph = item as GraphListItem;
    return {
      kind: 'graph',
      item: graph,
      detailUrl: getGraphDetailUrl(graph),
      displayText: graph.shelfmark || 'Untitled',
    };
  }
  return null;
}

const MediaGridCard = React.memo(function MediaGridCard({
  imageUrl,
  detailUrl,
  displayText,
  highlightKeyword,
  onLinkClick,
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
            <Link
              href={detailUrl}
              onClick={onLinkClick}
              className="block w-full h-full relative z-0 pointer-events-auto"
            >
              <Image
                src={imageUrl}
                alt={displayText}
                fill
                className="object-contain transition-transform duration-300 group-hover:scale-105"
                sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, (max-width: 1280px) 20vw, 16vw"
              />
            </Link>
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-200 pointer-events-none z-10" />
            <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-20">
              <div className="font-medium truncate text-xs">
                <Highlight text={displayText} keyword={highlightKeyword} />
              </div>
              {annotationCount != null && (
                <div className="text-xs text-white/80 mt-0.5">
                  <Highlight text={`${annotationCount} Annotations`} keyword={highlightKeyword} />
                </div>
              )}
            </div>
          </>
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
  detailUrl,
  displayText,
  highlightKeyword,
  onLinkClick,
}: {
  item: GraphListItem;
  detailUrl: string;
  displayText: string;
  highlightKeyword: string;
  onLinkClick: (e: React.MouseEvent<HTMLAnchorElement>) => void;
}) {
  const infoUrl = (item.image_iiif || '').trim();
  const imageUrl = useIiifThumbnailUrl(infoUrl, item.coordinates);

  return (
    <MediaGridCard
      imageUrl={imageUrl}
      detailUrl={detailUrl}
      displayText={displayText}
      highlightKeyword={highlightKeyword}
      onLinkClick={onLinkClick}
      loadingFallback={infoUrl ? '…' : 'No Image'}
      item={item}
      itemType="graph"
    />
  );
});

function SearchGridComponent({ results = [], resultType, highlightKeyword = '' }: SearchGridProps) {
  const router = useRouter();

  if (!results.length) {
    return <div className="text-center text-gray-500 py-10">No results to display.</div>;
  }

  return (
    <section className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
      {results.map((item) => {
        const card = toGridCard(resultType, item);
        if (!card) return null;
        const handleGraphLinkClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
          if (card.kind !== 'graph' || card.detailUrl !== '#') return;
          e.preventDefault();
          void resolveAndPushGraphDetail(card.item, router.push);
        };

        if (card.kind === 'graph' && card.item.image_iiif) {
          return (
            <GraphGridCard
              key={card.item.id}
              item={card.item}
              detailUrl={card.detailUrl}
              displayText={card.displayText}
              highlightKeyword={highlightKeyword}
              onLinkClick={handleGraphLinkClick}
            />
          );
        }

        return (
          <MediaGridCard
            key={card.item.id}
            imageUrl={card.kind === 'image' ? card.imageUrl : null}
            detailUrl={card.detailUrl}
            displayText={card.displayText}
            highlightKeyword={highlightKeyword}
            onLinkClick={handleGraphLinkClick}
            annotationCount={card.kind === 'image' ? card.item.number_of_annotations : null}
            item={card.item}
            itemType="image"
          />
        );
      })}
    </section>
  );
}

export const SearchGrid = React.memo(SearchGridComponent);
