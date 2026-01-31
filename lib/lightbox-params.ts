import type { CollectionItem } from '@/contexts/collection-context'
import type { ImageListItem } from '@/types/image'
import type { GraphListItem } from '@/types/graph'

type ItemType = 'image' | 'graph'
type ResolvedItem = CollectionItem | ImageListItem | GraphListItem

const API_BASE = typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000' : ''

/** Resolve a single item by id: from collection or fetch from API. Sets error and returns null on failure. */
export async function resolveItemById(
  type: ItemType,
  id: string,
  collectionItems: CollectionItem[],
  setError: (msg: string | null) => void
): Promise<ResolvedItem | null> {
  const numId = Number(id)
  const item = collectionItems.find((i) => i.id === numId && i.type === type)
  if (item) return item

  const endpoint = type === 'image' ? 'images' : 'graphs'
  const url = `${API_BASE}/api/v1/search/${endpoint}/${id}`
  try {
    const response = await fetch(url)
    if (!response.ok) {
      setError(`${type === 'image' ? 'Image' : 'Graph'} ${id} not found (${response.status}: ${response.statusText}). URL: ${url}`)
      return null
    }
    const data = await response.json()
    return { ...data, type } as ResolvedItem
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    setError(`Failed to load ${type} ${id}: ${msg}`)
    return null
  }
}

/** Resolve multiple items by ids: from collection + fetch missing from API. Pushes to itemsToLoad and may set error. */
export async function resolveItemsByIds(
  type: ItemType,
  ids: number[],
  collectionItems: CollectionItem[],
  itemsToLoad: ResolvedItem[],
  setError: (msg: string | null) => void
): Promise<void> {
  const fromCollection = collectionItems.filter((i) => ids.includes(i.id) && i.type === type)
  const missingIds = ids.filter((id) => !fromCollection.some((i) => i.id === id))
  const endpoint = type === 'image' ? 'images' : 'graphs'
  const label = type === 'image' ? 'image' : 'graph'
  const failed: string[] = []

  for (const id of missingIds) {
    try {
      const response = await fetch(`${API_BASE}/api/v1/search/${endpoint}/${id}`)
      if (response.ok) {
        const data = await response.json()
        itemsToLoad.push(data as ResolvedItem)
      } else {
        failed.push(`${label} ${id} (${response.status})`)
      }
    } catch (err) {
      failed.push(`${label} ${id}: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  if (failed.length > 0 && fromCollection.length === 0 && itemsToLoad.length === 0) {
    setError(`Could not load ${type === 'image' ? 'images' : 'graphs'}: ${failed.join('; ')}`)
  }
  itemsToLoad.push(...fromCollection)
}
