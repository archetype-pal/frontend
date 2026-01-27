'use client'

import Image from 'next/image'
import Link from 'next/link'
import type { ImageListItem } from '@/types/image'
import type { GraphListItem } from '@/types/graph'
import { Highlight } from './Highlight'
import { CollectionStar } from '@/components/collection-star'

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
    <section className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
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
            className="relative bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden group"
          >
            <div className="relative aspect-[4/3] bg-gray-50 overflow-hidden">
              {imageUrl ? (
                <>
                  <Link href={detailUrl} className="block w-full h-full relative z-0 pointer-events-auto">
                    <Image
                      src={imageUrl}
                      alt={displayText}
                      fill
                      className="object-contain transition-transform duration-300 group-hover:scale-105"
                    />
                  </Link>
                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-200 pointer-events-none z-10" />
                </>
              ) : (
                <div className="bg-gray-100 w-full h-full flex items-center justify-center text-sm text-gray-400">
                  No Image
                </div>
              )}
              {/* Star buttons - positioned above everything with high z-index */}
              {resultType === 'images' && (
                <CollectionStar
                  itemId={item.id}
                  itemType="image"
                  item={item}
                  className="z-30"
                />
              )}
              {resultType === 'graphs' && (
                <CollectionStar
                  itemId={item.id}
                  itemType="graph"
                  item={item}
                  className="z-30"
                />
              )}
            </div>
            <div className="p-3 text-center space-y-1">
              <div className="font-medium text-gray-800 truncate text-sm">
                <Highlight
                  text={displayText}
                  keyword={highlightKeyword}
                />
              </div>
              {(item as ImageListItem).number_of_annotations != null && (
                <div className="text-xs text-gray-500">
                  <Highlight
                    text={`${(item as ImageListItem).number_of_annotations} Annotations`}
                    keyword={highlightKeyword}
                  />
                </div>
              )}
            </div>
          </div>
        )
      })}
    </section>
  )
}
