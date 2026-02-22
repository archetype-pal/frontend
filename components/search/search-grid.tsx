'use client'

import * as React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import type { ImageListItem } from '@/types/image'
import type { GraphListItem } from '@/types/graph'
import { getIiifImageUrl } from '@/utils/iiif'
import { useIiifThumbnailUrl } from '@/hooks/use-iiif-thumbnail'
import { Highlight } from './highlight'
import { CollectionStar } from '@/components/collection/collection-star'
import { OpenLightboxButton } from '@/components/lightbox/open-lightbox-button'

export interface SearchGridProps {
  results?: (ImageListItem | GraphListItem)[]
  resultType: string
  highlightKeyword?: string
}

function GraphGridCard({
  item,
  detailUrl,
  displayText,
  highlightKeyword,
}: {
  item: GraphListItem
  detailUrl: string
  displayText: string
  highlightKeyword: string
}) {
  const infoUrl = (item.image_iiif || '').trim()
  const imageUrl = useIiifThumbnailUrl(infoUrl, item.coordinates)

  return (
    <div className="relative overflow-hidden group">
      <div className="relative aspect-[4/3] bg-white overflow-hidden">
        {imageUrl ? (
          <>
            <Link href={detailUrl} className="block w-full h-full relative z-0 pointer-events-auto">
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
            </div>
          </>
        ) : (
          <div className="bg-gray-100 w-full h-full flex items-center justify-center text-sm text-gray-400">
            {infoUrl ? '…' : 'No Image'}
          </div>
        )}
        <div className="absolute top-2 right-2 z-30 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <OpenLightboxButton item={item} variant="ghost" size="icon" className="bg-white/90 hover:bg-white h-7 w-7" />
          <CollectionStar itemId={item.id} itemType="graph" item={item} />
        </div>
      </div>
    </div>
  )
}

export function SearchGrid({
  results = [],
  resultType,
  highlightKeyword = '',
}: SearchGridProps) {
  if (!results.length) {
    return (
      <div className="text-center text-gray-500 py-10">
        No results to display.
      </div>
    )
  }

  return (
    <section className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
      {results.map((item) => {
        const isImage = resultType === 'images'
        const isGraph = resultType === 'graphs'
        const img = item as ImageListItem
        const graph = item as GraphListItem
        const detailUrl = resultType === 'images' ? `/digipal/${item.id}` : `/${resultType}/${item.id}`
        const displayText = (item as ImageListItem).locus || (item as GraphListItem).shelfmark || 'Untitled'

        if (isGraph && graph.image_iiif) {
          return (
            <GraphGridCard
              key={item.id}
              item={graph}
              detailUrl={detailUrl}
              displayText={displayText}
              highlightKeyword={highlightKeyword}
            />
          )
        }

        const imageUrl = isImage && img.image_iiif ? getIiifImageUrl(img.image_iiif, { thumbnail: true }) : null

        return (
          <div key={item.id} className="relative overflow-hidden group">
            <div className="relative aspect-[4/3] bg-white overflow-hidden">
              {imageUrl ? (
                <>
                  <Link href={detailUrl} className="block w-full h-full relative z-0 pointer-events-auto">
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
                    {(item as ImageListItem).number_of_annotations != null && (
                      <div className="text-xs text-white/80 mt-0.5">
                        <Highlight
                          text={`${(item as ImageListItem).number_of_annotations} Annotations`}
                          keyword={highlightKeyword}
                        />
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="bg-gray-100 w-full h-full flex items-center justify-center text-sm text-gray-400">
                  No Image
                </div>
              )}
              <div className="absolute top-2 right-2 z-30 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <OpenLightboxButton item={item} variant="ghost" size="icon" className="bg-white/90 hover:bg-white h-7 w-7" />
                {resultType === 'images' && <CollectionStar itemId={item.id} itemType="image" item={item} />}
              </div>
            </div>
          </div>
        )
      })}
    </section>
  )
}
