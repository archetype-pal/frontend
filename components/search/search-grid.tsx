'use client'

import Image from 'next/image'
import Link from 'next/link'
import type { ImageListItem } from '@/types/image'
import type { GraphListItem } from '@/types/graph'
import { Highlight } from './Highlight'
import { CollectionStar } from '@/components/collection-star'
import { OpenLightboxButton } from '@/components/lightbox/open-lightbox-button'

export interface SearchGridProps {
  results?: (ImageListItem | GraphListItem)[]
  resultType: string
  highlightKeyword?: string
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
        // Handle both ImageListItem and GraphListItem
        const imageUrl =
          (item as ImageListItem)?.thumbnail ||
          (item as GraphListItem)?.image_url ||
          (item as ImageListItem)?.image?.replace('/info.json', '/full/300,/0/default.jpg') ||
          null

        const detailUrl = resultType === 'images' 
          ? `/digipal/${item.id}` 
          : `/${resultType}/${item.id}`
        
        const displayText = (item as ImageListItem).locus || (item as GraphListItem).shelfmark || 'Untitled'

        return (
          <div
            key={item.id}
            className="relative overflow-hidden group"
          >
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
                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-200 pointer-events-none z-10" />
                  {/* Title overlay - shown on hover */}
                  <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-20">
                    <div className="font-medium truncate text-xs">
                      <Highlight
                        text={displayText}
                        keyword={highlightKeyword}
                      />
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
              {/* Action buttons - positioned above everything with high z-index */}
              <div className="absolute top-2 right-2 z-30 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <OpenLightboxButton
                  item={item}
                  variant="ghost"
                  size="icon"
                  className="bg-white/90 hover:bg-white h-7 w-7"
                />
                {resultType === 'images' && (
                  <CollectionStar
                    itemId={item.id}
                    itemType="image"
                    item={item}
                  />
                )}
                {resultType === 'graphs' && (
                  <CollectionStar
                    itemId={item.id}
                    itemType="graph"
                    item={item}
                  />
                )}
              </div>
            </div>
          </div>
        )
      })}
    </section>
  )
}
