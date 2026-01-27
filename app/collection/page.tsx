'use client'

import * as React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import { useCollection, type CollectionItem } from '@/contexts/collection-context'
import { CollectionStar } from '@/components/collection-star'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Trash2, Star, Search, X, ArrowUpDown } from 'lucide-react'
import type { ImageListItem } from '@/types/image'
import type { GraphListItem } from '@/types/graph'

type SortOption = 'added' | 'name' | 'repository'
type FilterType = 'all' | 'image' | 'graph'

export default function CollectionPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { items, clearCollection, removeItem } = useCollection()
  
  // Initialize state from URL params
  const [filter, setFilter] = React.useState<FilterType>(() => {
    const filterParam = searchParams.get('filter') as FilterType
    return filterParam && ['all', 'image', 'graph'].includes(filterParam) ? filterParam : 'all'
  })
  const [searchQuery, setSearchQuery] = React.useState(() => searchParams.get('q') || '')
  const [sortBy, setSortBy] = React.useState<SortOption>(() => {
    const sortParam = searchParams.get('sort') as SortOption
    return sortParam && ['added', 'name', 'repository'].includes(sortParam) ? sortParam : 'added'
  })
  const [showClearConfirm, setShowClearConfirm] = React.useState(false)

  // Helper function to update URL with current state
  const updateUrl = React.useCallback((updates: {
    filter?: FilterType
    search?: string
    sort?: SortOption
  }) => {
    const params = new URLSearchParams(searchParams.toString())
    const newFilter = updates.filter !== undefined ? updates.filter : filter
    const newSearch = updates.search !== undefined ? updates.search : searchQuery
    const newSort = updates.sort !== undefined ? updates.sort : sortBy
    
    // Update filter
    if (newFilter === 'all') {
      params.delete('filter')
    } else {
      params.set('filter', newFilter)
    }
    
    // Update search
    if (newSearch.trim()) {
      params.set('q', newSearch.trim())
    } else {
      params.delete('q')
    }
    
    // Update sort
    if (newSort === 'added') {
      params.delete('sort')
    } else {
      params.set('sort', newSort)
    }
    
    const queryString = params.toString()
    const newUrl = queryString ? `/collection?${queryString}` : '/collection'
    router.push(newUrl)
  }, [filter, searchQuery, sortBy, router, searchParams])

  // Debounced search URL update (preserves other params)
  React.useEffect(() => {
    const timer = setTimeout(() => {
      const params = new URLSearchParams()
      
      // Preserve filter
      if (filter !== 'all') {
        params.set('filter', filter)
      }
      
      // Update search
      if (searchQuery.trim()) {
        params.set('q', searchQuery.trim())
      }
      
      // Preserve sort
      if (sortBy !== 'added') {
        params.set('sort', sortBy)
      }
      
      const queryString = params.toString()
      const newUrl = queryString ? `/collection?${queryString}` : '/collection'
      window.history.replaceState(null, '', newUrl)
    }, 300) // 300ms debounce

    return () => clearTimeout(timer)
  }, [searchQuery, filter, sortBy])

  const images = React.useMemo(() => 
    items.filter((item) => item.type === 'image') as (ImageListItem & { type: 'image' })[]
  , [items])
  
  const graphs = React.useMemo(() => 
    items.filter((item) => item.type === 'graph') as (GraphListItem & { type: 'graph' })[]
  , [items])

  // Filter by type
  const typeFilteredItems = React.useMemo(() => {
    if (filter === 'all') return items
    return items.filter((item) => item.type === filter)
  }, [items, filter])

  // Search filter
  const searchFilteredItems = React.useMemo(() => {
    if (!searchQuery.trim()) return typeFilteredItems
    
    const query = searchQuery.toLowerCase().trim()
    return typeFilteredItems.filter((item) => {
      const shelfmark = item.type === 'image' 
        ? (item.shelfmark || item.locus || '').toLowerCase()
        : (item.shelfmark || '').toLowerCase()
      const repository = (item.repository_name || '').toLowerCase()
      return shelfmark.includes(query) || repository.includes(query)
    })
  }, [typeFilteredItems, searchQuery])

  // Sort items
  const sortedItems = React.useMemo(() => {
    const sorted = [...searchFilteredItems]
    
    switch (sortBy) {
      case 'name':
        sorted.sort((a, b) => {
          const nameA = (a.type === 'image' ? (a.shelfmark || a.locus || '') : (a.shelfmark || '')).toLowerCase()
          const nameB = (b.type === 'image' ? (b.shelfmark || b.locus || '') : (b.shelfmark || '')).toLowerCase()
          return nameA.localeCompare(nameB)
        })
        break
      case 'repository':
        sorted.sort((a, b) => {
          const repoA = (a.repository_name || '').toLowerCase()
          const repoB = (b.repository_name || '').toLowerCase()
          return repoA.localeCompare(repoB)
        })
        break
      case 'added':
      default:
        // Keep original order (most recently added first)
        break
    }
    
    return sorted
  }, [searchFilteredItems, sortBy])

  const displayedImages = sortedItems.filter((item) => item.type === 'image') as (ImageListItem & { type: 'image' })[]
  const displayedGraphs = sortedItems.filter((item) => item.type === 'graph') as (GraphListItem & { type: 'graph' })[]

  const handleClearCollection = () => {
    if (showClearConfirm) {
      clearCollection()
      setShowClearConfirm(false)
    } else {
      setShowClearConfirm(true)
      // Auto-hide confirmation after 3 seconds
      setTimeout(() => setShowClearConfirm(false), 3000)
    }
  }

  const getDetailUrl = (item: CollectionItem) => {
    if (item.type === 'image') {
      return `/digipal/${item.id}`
    }
    return `/graphs/${item.id}`
  }

  if (items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-16 sm:py-20">
        <div className="max-w-2xl mx-auto text-center">
          <div className="mb-8">
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-gray-50 to-gray-100 mb-6 shadow-sm">
              <Star className="h-12 w-12 text-gray-400" />
            </div>
          </div>
          <h1 className="text-4xl font-bold mb-4 text-gray-900">My Collection</h1>
          <p className="text-muted-foreground text-lg mb-10 leading-relaxed max-w-md mx-auto">
            Your collection is empty. Start adding items by hovering over thumbnails in the search pages and clicking the star icon.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/search/images">
              <Button size="lg" className="w-full sm:w-auto">
                Browse Images
              </Button>
            </Link>
            <Link href="/search/graphs">
              <Button size="lg" variant="outline" className="w-full sm:w-auto">
                Browse Graphs
              </Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-6 sm:py-8 max-w-7xl">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold mb-2 text-gray-900">My Collection</h1>
            <p className="text-muted-foreground text-sm sm:text-base">
              {items.length} {items.length === 1 ? 'item' : 'items'} saved
              {searchQuery && (
                <span className="ml-2">
                  • {sortedItems.length} {sortedItems.length === 1 ? 'match' : 'matches'}
                </span>
              )}
            </p>
          </div>
          <Button
            variant={showClearConfirm ? "destructive" : "outline"}
            size="sm"
            onClick={handleClearCollection}
            className="text-destructive hover:text-destructive hover:bg-destructive/10 w-full sm:w-auto"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            {showClearConfirm ? 'Click again to confirm' : 'Clear All'}
          </Button>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search by shelfmark, locus, or repository..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-9 h-10"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('')
                  updateUrl({ search: '' })
                }}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Type Filter */}
          <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
            <Button
              variant={filter === 'all' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => {
                setFilter('all')
                updateUrl({ filter: 'all' })
              }}
              className="min-w-[60px]"
            >
              All
            </Button>
            <Button
              variant={filter === 'image' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => {
                setFilter('image')
                updateUrl({ filter: 'image' })
              }}
              className="min-w-[70px]"
            >
              Images
            </Button>
            <Button
              variant={filter === 'graph' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => {
                setFilter('graph')
                updateUrl({ filter: 'graph' })
              }}
              className="min-w-[70px]"
            >
              Graphs
            </Button>
          </div>

          {/* Sort */}
          <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
            <Button
              variant={sortBy === 'added' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => {
                setSortBy('added')
                updateUrl({ sort: 'added' })
              }}
              className="min-w-[80px]"
            >
              <ArrowUpDown className="h-3.5 w-3.5 mr-1.5" />
              Added
            </Button>
            <Button
              variant={sortBy === 'name' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => {
                setSortBy('name')
                updateUrl({ sort: 'name' })
              }}
              className="min-w-[80px]"
            >
              Name
            </Button>
            <Button
              variant={sortBy === 'repository' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => {
                setSortBy('repository')
                updateUrl({ sort: 'repository' })
              }}
              className="min-w-[100px]"
            >
              Repository
            </Button>
          </div>
        </div>
      </div>

      <div className="space-y-12">
        {/* Only show Images section if filter is 'all' or 'image' */}
        {images.length > 0 && (filter === 'all' || filter === 'image') && (
          <section>
            <div className="flex items-center gap-2 mb-6">
              <h2 className="text-2xl sm:text-3xl font-semibold text-gray-900">Images</h2>
              <span className="text-sm text-muted-foreground bg-gray-100 px-3 py-1 rounded-full font-medium">
                {displayedImages.length} {displayedImages.length === 1 ? 'item' : 'items'}
                {displayedImages.length !== images.length && ` of ${images.length}`}
              </span>
            </div>
            {displayedImages.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-5">
                {displayedImages.map((item) => {
                const imageUrl =
                  item.thumbnail ||
                  item.image?.replace('/info.json', '/full/300,/0/default.jpg') ||
                  null

                return (
                  <div
                    key={`image-${item.id}`}
                    className="relative bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-lg hover:border-gray-300 transition-all duration-300 overflow-hidden group cursor-pointer"
                  >
                    <div className="relative aspect-[4/3] bg-gray-50 overflow-hidden">
                      {imageUrl ? (
                        <>
                          <Link href={getDetailUrl(item)} className="block w-full h-full">
                            <Image
                              src={imageUrl}
                              alt={item.shelfmark || item.locus || 'Item image'}
                              fill
                              className="object-contain transition-transform duration-300 group-hover:scale-110"
                              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, (max-width: 1280px) 20vw, 16vw"
                            />
                          </Link>
                          <div className="absolute inset-0 bg-gradient-to-t from-black/0 via-black/0 to-black/0 group-hover:from-black/5 group-hover:via-black/0 group-hover:to-black/0 transition-all duration-300 pointer-events-none" />
                        </>
                      ) : (
                        <div className="bg-gradient-to-br from-gray-100 to-gray-200 w-full h-full flex items-center justify-center text-xs text-gray-500">
                          No Image
                        </div>
                      )}
                      <div className="absolute top-2 right-2 z-10">
                        <CollectionStar
                          itemId={item.id}
                          itemType="image"
                          item={item}
                        />
                      </div>
                    </div>
                    <div className="p-3 text-center space-y-1 bg-white">
                      <div className="font-medium text-gray-900 truncate text-xs sm:text-sm" title={item.locus || item.shelfmark || 'Untitled'}>
                        {item.locus || item.shelfmark || 'Untitled'}
                      </div>
                      {item.repository_name && (
                        <div className="text-xs text-gray-500 truncate" title={item.repository_name}>
                          {item.repository_name}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
              </div>
            ) : (
              <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-sm text-muted-foreground mb-2">
                  {searchQuery ? 'No images match your search.' : 'No images match the current filter.'}
                </p>
                {searchQuery && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSearchQuery('')
                      updateUrl({ search: '' })
                    }}
                    className="mt-2"
                  >
                    Clear search
                  </Button>
                )}
              </div>
            )}
          </section>
        )}

        {/* Only show Graphs section if filter is 'all' or 'graph' */}
        {graphs.length > 0 && (filter === 'all' || filter === 'graph') && (
          <section>
            <div className="flex items-center gap-2 mb-6">
              <h2 className="text-2xl sm:text-3xl font-semibold text-gray-900">Graphs</h2>
              <span className="text-sm text-muted-foreground bg-gray-100 px-3 py-1 rounded-full font-medium">
                {displayedGraphs.length} {displayedGraphs.length === 1 ? 'item' : 'items'}
                {displayedGraphs.length !== graphs.length && ` of ${graphs.length}`}
              </span>
            </div>
            {displayedGraphs.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-5">
                {displayedGraphs.map((item) => {
                const imageUrl = item.image_url || null

                return (
                  <div
                    key={`graph-${item.id}`}
                    className="relative bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-lg hover:border-gray-300 transition-all duration-300 overflow-hidden group cursor-pointer"
                  >
                    <div className="relative aspect-[4/3] bg-gray-50 overflow-hidden">
                      {imageUrl ? (
                        <>
                          <Link href={getDetailUrl(item)} className="block w-full h-full">
                            <Image
                              src={imageUrl}
                              alt={item.shelfmark || 'Graph thumbnail'}
                              fill
                              className="object-contain transition-transform duration-300 group-hover:scale-110"
                              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, (max-width: 1280px) 20vw, 16vw"
                            />
                          </Link>
                          <div className="absolute inset-0 bg-gradient-to-t from-black/0 via-black/0 to-black/0 group-hover:from-black/5 group-hover:via-black/0 group-hover:to-black/0 transition-all duration-300 pointer-events-none" />
                        </>
                      ) : (
                        <div className="bg-gradient-to-br from-gray-100 to-gray-200 w-full h-full flex items-center justify-center text-xs text-gray-500">
                          No Image
                        </div>
                      )}
                      <div className="absolute top-2 right-2 z-10">
                        <CollectionStar
                          itemId={item.id}
                          itemType="graph"
                          item={item}
                        />
                      </div>
                    </div>
                    <div className="p-3 text-center space-y-1 bg-white">
                      <div className="font-medium text-gray-900 truncate text-xs sm:text-sm" title={item.shelfmark || 'Untitled'}>
                        {item.shelfmark || 'Untitled'}
                      </div>
                      {item.repository_name && (
                        <div className="text-xs text-gray-500 truncate" title={item.repository_name}>
                          {item.repository_name}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
              </div>
            ) : (
              <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-sm text-muted-foreground mb-2">
                  {searchQuery ? 'No graphs match your search.' : 'No graphs match the current filter.'}
                </p>
                {searchQuery && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSearchQuery('')
                      updateUrl({ search: '' })
                    }}
                    className="mt-2"
                  >
                    Clear search
                  </Button>
                )}
              </div>
            )}
          </section>
        )}

        {/* No results message when search returns nothing */}
        {searchQuery && sortedItems.length === 0 && (
          <div className="text-center py-16 bg-gray-50 rounded-lg border border-gray-200">
            <div className="max-w-md mx-auto">
              <Search className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No results found</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Try adjusting your search or filters to find what you're looking for.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchQuery('')
                  setFilter('all')
                  setSortBy('added')
                  router.push('/collection')
                }}
              >
                Clear all filters
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
