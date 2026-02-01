'use client'

import * as React from 'react'
import { Suspense } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useCollection, type CollectionItem } from '@/contexts/collection-context'
import { CollectionStar } from '@/components/collection/collection-star'
import { Button } from '@/components/ui/button'
import { Trash2, Star, ArrowUpDown } from 'lucide-react'
import { OpenLightboxButton } from '@/components/lightbox/open-lightbox-button'
import { getIiifImageUrl, getIiifImageUrlWithBounds, coordinatesFromGeoJson } from '@/utils/iiif'

type SortOption = 'added' | 'name' | 'repository'
type FilterType = 'all' | 'image' | 'graph'

/** Sync thumbnail URL for image items (no coordinates). */
function getImageItemThumbnailUrl(item: CollectionItem): string | null {
  const infoUrl = item.image_iiif
  if (!infoUrl) return null
  return getIiifImageUrl(infoUrl, { thumbnail: true })
}

function getItemTitle(item: CollectionItem): string {
  const locus = 'locus' in item ? item.locus : undefined
  return String(locus ?? item.shelfmark ?? 'Untitled')
}

/** Card for a graph item: fetches thumbnail URL with bounds + no upscaling, then renders. */
function CollectionGraphCard({
  item,
  getUrl,
  title,
}: {
  item: CollectionItem
  getUrl: (item: CollectionItem) => string
  title: string
}) {
  const [imageUrl, setImageUrl] = React.useState<string | null>(null)
  const infoUrl = (item.image_iiif || '').trim()
  const coords = item.coordinates != null ? coordinatesFromGeoJson(String(item.coordinates)) ?? undefined : undefined

  React.useEffect(() => {
    if (!infoUrl) {
      setImageUrl(null)
      return
    }
    let cancelled = false
    getIiifImageUrlWithBounds(infoUrl, { coordinates: coords, thumbnail: true })
      .then((url) => {
        if (!cancelled) setImageUrl(url)
      })
      .catch(() => {
        if (!cancelled) setImageUrl(null)
      })
    return () => {
      cancelled = true
    }
  }, [infoUrl, item.coordinates])

  return (
    <div className="relative bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-lg hover:border-gray-300 transition-all duration-300 overflow-hidden group cursor-pointer">
      <div className="relative aspect-[4/3] bg-gray-50 overflow-hidden">
        {imageUrl ? (
          <>
            <Link href={getUrl(item)} className="block w-full h-full">
              <Image
                src={imageUrl}
                alt={title}
                fill
                className="object-contain transition-transform duration-300 group-hover:scale-110"
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, (max-width: 1280px) 20vw, 16vw"
              />
            </Link>
            <div className="absolute inset-0 bg-gradient-to-t from-black/0 via-black/0 to-black/0 group-hover:from-black/5 group-hover:via-black/0 group-hover:to-black/0 transition-all duration-300 pointer-events-none" />
          </>
        ) : (
          <div className="bg-gradient-to-br from-gray-100 to-gray-200 w-full h-full flex items-center justify-center text-xs text-gray-500">
            {infoUrl ? '…' : 'No Image'}
          </div>
        )}
        <div className="absolute top-2 right-2 z-10 flex gap-1">
          <OpenLightboxButton item={item} variant="ghost" size="icon" className="bg-white/80 hover:bg-white" />
          <CollectionStar itemId={item.id} itemType="graph" item={item} />
        </div>
      </div>
      <div className="p-3 text-center space-y-1 bg-white">
        <div className="font-medium text-gray-900 truncate text-xs sm:text-sm" title={title}>{title}</div>
        {item.repository_name && <div className="text-xs text-gray-500 truncate" title={item.repository_name}>{item.repository_name}</div>}
      </div>
    </div>
  )
}

function CollectionPageContent() {
  const searchParams = useSearchParams()
  const { items, clearCollection } = useCollection()
  const [filter, setFilter] = React.useState<FilterType>(() => {
    const p = searchParams.get('filter') as FilterType
    return p && ['all', 'image', 'graph'].includes(p) ? p : 'all'
  })
  const [sortBy, setSortBy] = React.useState<SortOption>(() => {
    const p = searchParams.get('sort') as SortOption
    return p && ['added', 'name', 'repository'].includes(p) ? p : 'added'
  })
  const [showClearConfirm, setShowClearConfirm] = React.useState(false)
  const timeoutRef = React.useRef<NodeJS.Timeout | null>(null)

  React.useEffect(() => {
    const params = new URLSearchParams()
    if (filter !== 'all') params.set('filter', filter)
    if (sortBy !== 'added') params.set('sort', sortBy)
    window.history.replaceState(null, '', params.toString() ? `/collection?${params}` : '/collection')
  }, [filter, sortBy])

  React.useEffect(() => {
    if (items.length === 0) {
      setShowClearConfirm(false)
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
    }
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [items.length])

  const filteredItems = React.useMemo(() => {
    const filtered = filter === 'all' ? items : items.filter((item) => item.type === filter)
    if (sortBy === 'added') return filtered
    
    return [...filtered].sort((a, b) => {
      if (sortBy === 'name') {
        const nameA = (a.type === 'image' ? (a.shelfmark || a.locus || '') : (a.shelfmark || '')).toLowerCase()
        const nameB = (b.type === 'image' ? (b.shelfmark || b.locus || '') : (b.shelfmark || '')).toLowerCase()
        return nameA.localeCompare(nameB)
      }
      return ((a.repository_name || '').toLowerCase()).localeCompare((b.repository_name || '').toLowerCase())
    })
  }, [items, filter, sortBy])

  const images = filteredItems.filter((item) => item.type === 'image')
  const graphs = filteredItems.filter((item) => item.type === 'graph')
  const allImages = items.filter((item) => item.type === 'image')
  const allGraphs = items.filter((item) => item.type === 'graph')

  const handleClear = () => {
    if (showClearConfirm) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      clearCollection()
      setShowClearConfirm(false)
    } else {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      setShowClearConfirm(true)
      timeoutRef.current = setTimeout(() => {
        setShowClearConfirm(false)
        timeoutRef.current = null
      }, 5000)
    }
  }

  const getUrl = (item: CollectionItem) => item.type === 'image' ? `/digipal/${item.id}` : `/graphs/${item.id}`

  if (items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-16 sm:py-20">
        <div className="max-w-2xl mx-auto text-center">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-gray-50 to-gray-100 mb-6 shadow-sm">
            <Star className="h-12 w-12 text-gray-400" />
          </div>
          <h1 className="text-4xl font-bold mb-4 text-gray-900">My Collection</h1>
          <p className="text-muted-foreground text-lg mb-10 leading-relaxed max-w-md mx-auto">
            Your collection is empty. Start adding items by hovering over thumbnails in the search pages and clicking the star icon.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/search/images"><Button size="lg" className="w-full sm:w-auto">Browse Images</Button></Link>
            <Link href="/search/graphs"><Button size="lg" variant="outline" className="w-full sm:w-auto">Browse Graphs</Button></Link>
          </div>
        </div>
      </div>
    )
  }

  const renderCard = (item: CollectionItem, type: 'image' | 'graph') => {
    const title = getItemTitle(item)

    if (type === 'graph') {
      return <CollectionGraphCard key={`graph-${item.id}`} item={item} getUrl={getUrl} title={title} />
    }

    const imageUrl = getImageItemThumbnailUrl(item)
    return (
      <div key={`image-${item.id}`} className="relative bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-lg hover:border-gray-300 transition-all duration-300 overflow-hidden group cursor-pointer">
        <div className="relative aspect-[4/3] bg-gray-50 overflow-hidden">
          {imageUrl ? (
            <>
              <Link href={getUrl(item)} className="block w-full h-full">
                <Image
                  src={imageUrl}
                  alt={title}
                  fill
                  className="object-contain transition-transform duration-300 group-hover:scale-110"
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, (max-width: 1280px) 20vw, 16vw"
                />
              </Link>
              <div className="absolute inset-0 bg-gradient-to-t from-black/0 via-black/0 to-black/0 group-hover:from-black/5 group-hover:via-black/0 group-hover:to-black/0 transition-all duration-300 pointer-events-none" />
            </>
          ) : (
            <div className="bg-gradient-to-br from-gray-100 to-gray-200 w-full h-full flex items-center justify-center text-xs text-gray-500">No Image</div>
          )}
          <div className="absolute top-2 right-2 z-10 flex gap-1">
            <OpenLightboxButton item={item} variant="ghost" size="icon" className="bg-white/80 hover:bg-white" />
            <CollectionStar itemId={item.id} itemType="image" item={item} />
          </div>
        </div>
        <div className="p-3 text-center space-y-1 bg-white">
          <div className="font-medium text-gray-900 truncate text-xs sm:text-sm" title={title}>{title}</div>
          {item.repository_name && <div className="text-xs text-gray-500 truncate" title={item.repository_name}>{item.repository_name}</div>}
        </div>
      </div>
    )
  }

  const renderSection = (title: string, items: CollectionItem[], allItems: CollectionItem[], type: 'image' | 'graph') => {
    if (allItems.length === 0 || (filter !== 'all' && filter !== type)) return null
    
    return (
      <section>
        <div className="flex items-center gap-2 mb-6">
          <h2 className="text-2xl sm:text-3xl font-semibold text-gray-900">{title}</h2>
          <span className="text-sm text-muted-foreground bg-gray-100 px-3 py-1 rounded-full font-medium">
            {items.length} {items.length === 1 ? 'item' : 'items'}{items.length !== allItems.length && ` of ${allItems.length}`}
          </span>
        </div>
        {items.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-5">
            {items.map((item) => renderCard(item, type))}
          </div>
        ) : (
          <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-sm text-muted-foreground">No {title.toLowerCase()} match the current filter.</p>
          </div>
        )}
      </section>
    )
  }

  return (
    <div className="container mx-auto px-4 py-6 sm:py-8 max-w-7xl">
      <div className="mb-6 sm:mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold mb-2 text-gray-900">My Collection</h1>
            <p className="text-muted-foreground text-sm sm:text-base">{items.length} {items.length === 1 ? 'item' : 'items'} saved</p>
          </div>
          <div className="flex gap-2">
            <OpenLightboxButton
              items={items}
              variant="outline"
              size="sm"
            />
            <Button 
              variant={showClearConfirm ? "destructive" : "outline"} 
              size="sm" 
              onClick={handleClear} 
              className={showClearConfirm ? "w-full sm:w-auto" : "text-destructive hover:text-destructive hover:bg-destructive/10 w-full sm:w-auto"}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {showClearConfirm ? 'Click again to confirm' : 'Clear All'}
            </Button>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
            {(['all', 'image', 'graph'] as FilterType[]).map((f) => (
              <Button key={f} variant={filter === f ? 'default' : 'ghost'} size="sm" onClick={() => setFilter(f)} className={f === 'all' ? 'min-w-[60px]' : 'min-w-[70px]'}>
                {f === 'all' ? 'All' : f === 'image' ? 'Images' : 'Graphs'}
              </Button>
            ))}
          </div>
          <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
            {(['added', 'name', 'repository'] as SortOption[]).map((s) => (
              <Button key={s} variant={sortBy === s ? 'default' : 'ghost'} size="sm" onClick={() => setSortBy(s)} className={s === 'repository' ? 'min-w-[100px]' : 'min-w-[80px]'}>
                {s === 'added' && <ArrowUpDown className="h-3.5 w-3.5 mr-1.5" />}
                {s === 'added' ? 'Added' : s === 'name' ? 'Name' : 'Repository'}
              </Button>
            ))}
          </div>
        </div>
      </div>
      <div className="space-y-12">
        {renderSection('Images', images, allImages, 'image')}
        {renderSection('Graphs', graphs, allGraphs, 'graph')}
      </div>
    </div>
  )
}

export default function CollectionPage() {
  return (
    <Suspense fallback={<div className="container mx-auto px-4 py-16 text-center">Loading...</div>}>
      <CollectionPageContent />
    </Suspense>
  )
}
