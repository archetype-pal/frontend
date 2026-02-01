import { create } from 'zustand'
import { useShallow } from 'zustand/react/shallow'
import { getIiifImageUrl, getIiifImageUrlWithBounds, coordinatesFromGeoJson } from '@/utils/iiif'
import type { LightboxImage, LightboxWorkspace } from '@/lib/lightbox-db'
import type { ImageListItem } from '@/types/image'
import type { GraphListItem } from '@/types/graph'
import type { CollectionItem } from '@/contexts/collection-context'

export interface LightboxState {
  // Current workspace
  currentWorkspaceId: string | null
  workspaces: LightboxWorkspace[]
  images: Map<string, LightboxImage>

  // UI state
  isLoading: boolean
  error: string | null
  selectedImageIds: Set<string>

  // Viewer state
  zoom: number
  showAnnotations: boolean
  showGrid: boolean

  // History for undo/redo
  history: Array<{
    workspaces: LightboxWorkspace[]
    images: Map<string, LightboxImage>
  }>
  historyIndex: number

  // Actions
  initialize: () => Promise<void>
  setCurrentWorkspace: (workspaceId: string | null) => void
  createWorkspace: (name?: string) => Promise<string>
  deleteWorkspace: (workspaceId: string) => Promise<void>
  loadImage: (item: CollectionItem | ImageListItem | GraphListItem) => Promise<string>
  loadImages: (items: (CollectionItem | ImageListItem | GraphListItem)[]) => Promise<string[]>
  removeImage: (imageId: string) => Promise<void>
  updateImage: (imageId: string, updates: Partial<LightboxImage>) => Promise<void>
  selectImage: (imageId: string) => void
  deselectImage: (imageId: string) => void
  selectAll: () => void
  deselectAll: () => void
  setZoom: (zoom: number) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  clearError: () => void
  loadSession: (sessionId: string) => Promise<void>
  setShowAnnotations: (show: boolean) => void
  setShowGrid: (show: boolean) => void
  undo: () => void
  redo: () => void
  saveHistory: () => void
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

function createWorkspaceId(): string {
  return `workspace-${generateId()}`
}

function createImageId(): string {
  return `image-${generateId()}`
}

// Initialize store with data from IndexedDB. Throws on failure so caller can set error (fail loud).
async function initializeStore(): Promise<{
  workspaces: LightboxWorkspace[]
  images: Map<string, LightboxImage>
}> {
  const { getAllWorkspaces, getWorkspaceImages } = await import('@/lib/lightbox-db')
  const workspaces = await getAllWorkspaces()
  const imagesMap = new Map<string, LightboxImage>()

  for (const workspace of workspaces) {
    const workspaceImages = await getWorkspaceImages(workspace.id)
    workspaceImages.forEach((img) => {
      imagesMap.set(img.id, img)
    })
  }

  return { workspaces, images: imagesMap }
}

export const useLightboxStore = create<LightboxState>((set, get) => ({
  currentWorkspaceId: null,
  workspaces: [],
  images: new Map(),
  isLoading: false,
  error: null,
  selectedImageIds: new Set(),
  zoom: 1,
  showAnnotations: false,
  showGrid: false,
  history: [],
  historyIndex: -1,

  // Initialize function to load from IndexedDB
  initialize: async () => {
    set({ isLoading: true })
    try {
      const { workspaces, images } = await initializeStore()
      set({
        workspaces,
        images,
        currentWorkspaceId: workspaces.length > 0 ? workspaces[0].id : null,
        isLoading: false
      })
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to initialize',
        isLoading: false
      })
    }
  },

  setCurrentWorkspace: (workspaceId) => {
    set({ currentWorkspaceId: workspaceId, selectedImageIds: new Set() })
  },

  createWorkspace: async (name) => {
    get().saveHistory()

    const workspaceId = createWorkspaceId()
    const workspace: LightboxWorkspace = {
      id: workspaceId,
      name: name || `Workspace ${get().workspaces.length + 1}`,
      images: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }

    set((state) => ({
      workspaces: [...state.workspaces, workspace],
      currentWorkspaceId: workspaceId,
    }))

    // Save to IndexedDB
    const { saveWorkspace } = await import('@/lib/lightbox-db')
    await saveWorkspace(workspace)

    return workspaceId
  },

  deleteWorkspace: async (workspaceId) => {
    const { deleteWorkspace: deleteWorkspaceDb } = await import('@/lib/lightbox-db')
    await deleteWorkspaceDb(workspaceId)

    set((state) => {
      const workspaces = state.workspaces.filter((w) => w.id !== workspaceId)
      const images = new Map(state.images)

      // Remove images from this workspace
      state.images.forEach((img, id) => {
        if (img.workspaceId === workspaceId) {
          images.delete(id)
        }
      })

      return {
        workspaces,
        images,
        currentWorkspaceId: state.currentWorkspaceId === workspaceId ? null : state.currentWorkspaceId,
      }
    })
  },

  loadImage: async (item) => {
    const state = get()
    let workspaceId = state.currentWorkspaceId

    // Create workspace if none exists
    if (!workspaceId) {
      workspaceId = await get().createWorkspace()
    }

    const imageId = createImageId()
    const type = 'type' in item ? item.type : ('image' in item ? 'image' : 'graph')

    // Build IIIF image URLs from image_iiif (and coordinates for graphs)
    let imageUrl = ''
    let thumbnailUrl = ''

    if (type === 'image') {
      const imgItem = item as ImageListItem | CollectionItem
      const infoUrl = (imgItem as ImageListItem).image_iiif ?? (imgItem as CollectionItem).image_iiif ?? ''
      if (infoUrl) {
        imageUrl = getIiifImageUrl(infoUrl)
        thumbnailUrl = getIiifImageUrl(infoUrl, { thumbnail: true })
      }
    } else {
      const graphItem = item as GraphListItem | CollectionItem
      const infoUrl = (graphItem as GraphListItem).image_iiif ?? (graphItem as CollectionItem).image_iiif ?? ''
      const coords = (graphItem as GraphListItem).coordinates != null
        ? coordinatesFromGeoJson((graphItem as GraphListItem).coordinates)
        : (graphItem as CollectionItem).coordinates != null
          ? coordinatesFromGeoJson(String((graphItem as CollectionItem).coordinates))
          : undefined
      if (infoUrl) {
        const opts = { coordinates: coords ?? undefined }
        imageUrl = await getIiifImageUrlWithBounds(infoUrl, opts)
        thumbnailUrl = await getIiifImageUrlWithBounds(infoUrl, { ...opts, thumbnail: true })
      }
    }

    const lightboxImage: LightboxImage = {
      id: imageId,
      originalId: typeof item.id === 'number' ? item.id : 0,
      type: type as 'image' | 'graph',
      imageUrl,
      thumbnailUrl,
      metadata: {
        shelfmark: item.shelfmark != null ? String(item.shelfmark) : undefined,
        locus: 'locus' in item && item.locus != null ? String(item.locus) : undefined,
        repository_name: item.repository_name != null ? String(item.repository_name) : undefined,
        repository_city: item.repository_city != null ? String(item.repository_city) : undefined,
        date: item.date != null ? String(item.date) : undefined,
      },
      workspaceId,
      position: {
        x: Math.random() * 200,
        y: Math.random() * 200,
        zIndex: state.images.size + 1,
      },
      size: {
        width: 400,
        height: 400,
      },
      transform: {
        opacity: 1,
        brightness: 100,
        contrast: 100,
        rotation: 0,
        flipX: false,
        flipY: false,
        grayscale: false,
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }

    // Update workspace
    const workspace = state.workspaces.find((w) => w.id === workspaceId)
    if (workspace) {
      const updatedWorkspace = {
        ...workspace,
        images: [...workspace.images, imageId],
        updatedAt: Date.now(),
      }
      const { saveWorkspace } = await import('@/lib/lightbox-db')
      await saveWorkspace(updatedWorkspace)

      // Update workspace in state
      set((state) => ({
        workspaces: state.workspaces.map((w) =>
          w.id === workspaceId ? updatedWorkspace : w
        ),
      }))
    }

    // Save image
    const { saveImage } = await import('@/lib/lightbox-db')
    await saveImage(lightboxImage)

    // Update state
    set((state) => {
      const images = new Map(state.images)
      images.set(imageId, lightboxImage)
      return { images }
    })

    return imageId
  },

  loadImages: async (items) => {
    const imageIds: string[] = []
    for (const item of items) {
      const id = await get().loadImage(item)
      imageIds.push(id)
    }
    return imageIds
  },

  removeImage: async (imageId) => {
    // Save history before removal
    get().saveHistory()

    const { deleteImage } = await import('@/lib/lightbox-db')
    await deleteImage(imageId)

    set((state) => {
      const images = new Map(state.images)
      images.delete(imageId)

      // Update workspace
      const workspaces = state.workspaces.map((w) => {
        if (w.images.includes(imageId)) {
          return {
            ...w,
            images: w.images.filter((id) => id !== imageId),
            updatedAt: Date.now(),
          }
        }
        return w
      })

      return { images, workspaces }
    })
  },

  updateImage: async (imageId, updates) => {
    const state = get()
    const image = state.images.get(imageId)
    if (!image) return

    const updated = {
      ...image,
      ...updates,
      updatedAt: Date.now(),
    }

    const { saveImage } = await import('@/lib/lightbox-db')
    await saveImage(updated)

    set((state) => {
      const images = new Map(state.images)
      images.set(imageId, updated)
      return { images }
    })
  },

  selectImage: (imageId) => {
    set((state) => {
      const selected = new Set(state.selectedImageIds)
      selected.add(imageId)
      return { selectedImageIds: selected }
    })
  },

  deselectImage: (imageId) => {
    set((state) => {
      const selected = new Set(state.selectedImageIds)
      selected.delete(imageId)
      return { selectedImageIds: selected }
    })
  },

  selectAll: () => {
    const state = get()
    const allIds = Array.from(state.images.keys()).filter(
      (id) => state.images.get(id)?.workspaceId === state.currentWorkspaceId
    )
    set({ selectedImageIds: new Set(allIds) })
  },

  deselectAll: () => {
    set({ selectedImageIds: new Set() })
  },

  setZoom: (zoom) => {
    set({ zoom })
  },

  setLoading: (loading) => {
    set({ isLoading: loading })
  },

  setError: (error) => {
    set({ error })
  },

  clearError: () => {
    set({ error: null })
  },

  loadSession: async (sessionId) => {
    set({ isLoading: true })
    try {
      const { getSession } = await import('@/lib/lightbox-db')
      const session = await getSession(sessionId)

      if (!session) {
        throw new Error('Session not found')
      }

      // Load workspaces and images from session
      const { saveWorkspace, saveImage } = await import('@/lib/lightbox-db')

      // Save workspaces
      for (const workspace of session.workspaces) {
        await saveWorkspace(workspace)
      }

      // Save images
      const imagesMap = new Map<string, LightboxImage>()
      for (const image of session.images) {
        await saveImage(image)
        imagesMap.set(image.id, image)
      }

      // Set first workspace as current
      const firstWorkspaceId = session.workspaces[0]?.id || null

      set({
        workspaces: session.workspaces,
        images: imagesMap,
        currentWorkspaceId: firstWorkspaceId,
        isLoading: false,
      })
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load session',
        isLoading: false,
      })
    }
  },

  setShowAnnotations: (show) => {
    set({ showAnnotations: show })
  },

  setShowGrid: (show) => {
    set({ showGrid: show })
  },

  saveHistory: () => {
    const state = get()
    const snapshot = {
      workspaces: JSON.parse(JSON.stringify(state.workspaces)),
      images: new Map(state.images),
    }

    set((state) => {
      const newHistory = state.history.slice(0, state.historyIndex + 1)
      newHistory.push(snapshot)
      // Keep last 50 history entries
      const trimmedHistory = newHistory.slice(-50)
      return {
        history: trimmedHistory,
        historyIndex: trimmedHistory.length - 1,
      }
    })
  },

  undo: () => {
    const state = get()
    if (state.historyIndex >= 0 && state.history[state.historyIndex]) {
      const prevState = state.history[state.historyIndex]
      set({
        workspaces: prevState.workspaces,
        images: prevState.images,
        historyIndex: state.historyIndex - 1,
      })
    }
  },

  redo: () => {
    const state = get()
    if (state.historyIndex < state.history.length - 1) {
      const nextState = state.history[state.historyIndex + 1]
      set({
        workspaces: nextState.workspaces,
        images: nextState.images,
        historyIndex: state.historyIndex + 1,
      })
    }
  },
}))

/** Images in the current workspace. Use in components instead of duplicating filter logic. */
export function useWorkspaceImages(): LightboxImage[] {
  return useLightboxStore(
    useShallow((state) => {
      if (!state.currentWorkspaceId) return []
      return Array.from(state.images.values()).filter(
        (img) => img.workspaceId === state.currentWorkspaceId
      )
    })
  )
}

/** Selected images (resolved from selectedImageIds). Use instead of duplicating map+filter. */
export function useSelectedImages(): LightboxImage[] {
  return useLightboxStore(
    useShallow((state) =>
      Array.from(state.selectedImageIds)
        .map((id) => state.images.get(id))
        .filter((img): img is LightboxImage => img != null)
    )
  )
}
