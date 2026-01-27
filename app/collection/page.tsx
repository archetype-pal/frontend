'use client'

import * as React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useCollection, type CollectionItem } from '@/contexts/collection-context'
import { CollectionStar } from '@/components/collection-star'
import { Button } from '@/components/ui/button'
import { Trash2, Star } from 'lucide-react'
import type { ImageListItem } from '@/types/image'
import type { GraphListItem } from '@/types/graph'

export default function CollectionPage() {
  const { items, clearCollection, removeItem } = useCollection()
  const [filter, setFilter] = React.useState<'all' | 'image' | 'graph'>('all')

  const images = React.useMemo(() => 
    items.filter((item) => item.type === 'image') as (ImageListItem & { type: 'image' })[]
  , [items])
  
  const graphs = React.useMemo(() => 
    items.filter((item) => item.type === 'graph') as (GraphListItem & { type: 'graph' })[]
  , [items])

  const filteredItems = React.useMemo(() => {
    if (filter === 'all') return items
    return items.filter((item) => item.type === filter)
  }, [items, filter])

  const displayedImages = filteredItems.filter((item) => item.type === 'image') as (ImageListItem & { type: 'image' })[]
  const displayedGraphs = filteredItems.filter((item) => item.type === 'graph') as (GraphListItem & { type: 'graph' })[]

  const getDetailUrl = (item: CollectionItem) => {
    if (item.type === 'image') {
      return `/digipal/${item.id}`
    }
    return `/graphs/${item.id}`
  }

  if (items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto text-center">
          <div className="mb-6">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gray-100 mb-4">
              <Star className="h-10 w-10 text-gray-400" />
            </div>
          </div>
          <h1 className="text-3xl font-bold mb-3">My Collection</h1>
          <p className="text-muted-foreground text-lg mb-8 leading-relaxed">
            Your collection is empty. Start adding items by hovering over thumbnails in the search pages and clicking the star icon.
          </p>
          <div className="flex gap-3 justify-center">
            <Link href="/search/images">
              <Button size="lg">Browse Images</Button>
            </Link>
            <Link href="/search/graphs">
              <Button size="lg" variant="outline">Browse Graphs</Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-1">My Collection</h1>
          <p className="text-muted-foreground text-sm">
            {items.length} {items.length === 1 ? 'item' : 'items'} saved
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
            <Button
              variant={filter === 'all' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setFilter('all')}
              className="min-w-[60px]"
            >
              All
            </Button>
            <Button
              variant={filter === 'image' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setFilter('image')}
              className="min-w-[70px]"
            >
              Images
            </Button>
            <Button
              variant={filter === 'graph' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setFilter('graph')}
              className="min-w-[70px]"
            >
              Graphs
            </Button>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={clearCollection}
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Clear All
          </Button>
        </div>
      </div>

      <div className="space-y-10">
        {images.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-5">
              <h2 className="text-2xl font-semibold">Images</h2>
              <span className="text-sm text-muted-foreground bg-gray-100 px-2.5 py-0.5 rounded-full">
                {images.length}
              </span>
            </div>
            {displayedImages.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {displayedImages.map((item) => {
                const imageUrl =
                  item.thumbnail ||
                  item.image?.replace('/info.json', '/full/300,/0/default.jpg') ||
                  null

                return (
                  <div
                    key={`image-${item.id}`}
                    className="relative bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden group"
                  >
                    <div className="relative aspect-[4/3] bg-gray-50 overflow-hidden">
                      {imageUrl ? (
                        <>
                          <Link href={getDetailUrl(item)} className="block w-full h-full">
                            <Image
                              src={imageUrl}
                              alt={item.shelfmark || item.locus || 'Item image'}
                              fill
                              className="object-contain transition-transform duration-300 group-hover:scale-105"
                            />
                          </Link>
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-200 pointer-events-none" />
                        </>
                      ) : (
                        <div className="bg-gray-100 w-full h-full flex items-center justify-center text-xs text-gray-400">
                          No Image
                        </div>
                      )}
                      <CollectionStar
                        itemId={item.id}
                        itemType="image"
                        item={item}
                      />
                    </div>
                    <div className="p-2.5 text-center space-y-0.5">
                      <div className="font-medium text-gray-800 truncate text-xs">
                        {item.locus || item.shelfmark || 'Untitled'}
                      </div>
                      {item.repository_name && (
                        <div className="text-xs text-gray-500 truncate">
                          {item.repository_name}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
              </div>
            ) : (
              <div className="text-center text-sm text-muted-foreground py-8">
                No images match the current filter.
              </div>
            )}
          </section>
        )}

        {graphs.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-5">
              <h2 className="text-2xl font-semibold">Graphs</h2>
              <span className="text-sm text-muted-foreground bg-gray-100 px-2.5 py-0.5 rounded-full">
                {graphs.length}
              </span>
            </div>
            {displayedGraphs.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {displayedGraphs.map((item) => {
                const imageUrl = item.image_url || null

                return (
                  <div
                    key={`graph-${item.id}`}
                    className="relative bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden group"
                  >
                    <div className="relative aspect-[4/3] bg-gray-50 overflow-hidden">
                      {imageUrl ? (
                        <>
                          <Link href={getDetailUrl(item)} className="block w-full h-full">
                            <Image
                              src={imageUrl}
                              alt={item.shelfmark || 'Graph thumbnail'}
                              fill
                              className="object-contain transition-transform duration-300 group-hover:scale-105"
                            />
                          </Link>
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-200 pointer-events-none" />
                        </>
                      ) : (
                        <div className="bg-gray-100 w-full h-full flex items-center justify-center text-xs text-gray-400">
                          No Image
                        </div>
                      )}
                      <CollectionStar
                        itemId={item.id}
                        itemType="graph"
                        item={item}
                      />
                    </div>
                    <div className="p-2.5 text-center space-y-0.5">
                      <div className="font-medium text-gray-800 truncate text-xs">
                        {item.shelfmark || 'Untitled'}
                      </div>
                      {item.repository_name && (
                        <div className="text-xs text-gray-500 truncate">
                          {item.repository_name}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
              </div>
            ) : (
              <div className="text-center text-sm text-muted-foreground py-8">
                No graphs match the current filter.
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  )
}
