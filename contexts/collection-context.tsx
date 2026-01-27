'use client'

import * as React from 'react'

export type CollectionItem = {
  id: number
  type: 'image' | 'graph'
  thumbnail?: string
  image?: string
  shelfmark?: string
  locus?: string
  repository_name?: string
  repository_city?: string
  date?: string
  [key: string]: any // Allow additional properties
}

type CollectionContextType = {
  items: CollectionItem[]
  addItem: (item: CollectionItem) => void
  removeItem: (id: number, type: 'image' | 'graph') => void
  isInCollection: (id: number, type: 'image' | 'graph') => boolean
  clearCollection: () => void
}

const CollectionContext = React.createContext<CollectionContextType | undefined>(undefined)

const STORAGE_KEY = 'archetype_collection'

function loadFromStorage(): CollectionItem[] {
  if (typeof window === 'undefined') return []
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

function saveToStorage(items: CollectionItem[]): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  } catch {
    // Ignore storage errors
  }
}

export function CollectionProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<CollectionItem[]>(loadFromStorage)

  // Sync with localStorage on mount and when items change
  React.useEffect(() => {
    saveToStorage(items)
  }, [items])

  const addItem = React.useCallback((item: CollectionItem) => {
    setItems((prev) => {
      // Check if item already exists
      const exists = prev.some((i) => i.id === item.id && i.type === item.type)
      if (exists) return prev
      return [...prev, item]
    })
  }, [])

  const removeItem = React.useCallback((id: number, type: 'image' | 'graph') => {
    setItems((prev) => prev.filter((i) => !(i.id === id && i.type === type)))
  }, [])

  const isInCollection = React.useCallback(
    (id: number, type: 'image' | 'graph') => {
      return items.some((i) => i.id === id && i.type === type)
    },
    [items]
  )

  // Force re-render when items change by including items in the value
  React.useEffect(() => {
    // This ensures components re-render when items change
  }, [items])

  const clearCollection = React.useCallback(() => {
    setItems([])
  }, [])

  const value = React.useMemo(
    () => ({
      items,
      addItem,
      removeItem,
      isInCollection,
      clearCollection,
    }),
    [items, addItem, removeItem, isInCollection, clearCollection]
  )

  return <CollectionContext.Provider value={value}>{children}</CollectionContext.Provider>
}

export function useCollection() {
  const context = React.useContext(CollectionContext)
  if (context === undefined) {
    throw new Error('useCollection must be used within a CollectionProvider')
  }
  return context
}
