import Dexie, { type Table } from 'dexie'

export interface LightboxImage {
  id: string // Unique ID for lightbox (not the original image ID)
  originalId: number // Original image/graph ID from system
  type: 'image' | 'graph'
  imageUrl: string // IIIF URL or direct image URL
  thumbnailUrl?: string
  metadata: {
    shelfmark?: string
    locus?: string
    repository_name?: string
    repository_city?: string
    date?: string
    [key: string]: unknown
  }
  workspaceId: string
  position: {
    x: number
    y: number
    zIndex: number
  }
  size: {
    width: number
    height: number
  }
  transform: {
    opacity: number
    brightness: number
    contrast: number
    rotation: number
    flipX: boolean
    flipY: boolean
    grayscale: boolean
  }
  createdAt: number
  updatedAt: number
}

export interface LightboxWorkspace {
  id: string
  name: string
  images: string[] // Array of image IDs
  createdAt: number
  updatedAt: number
}

export interface LightboxSession {
  id: string
  name: string
  workspaces: LightboxWorkspace[]
  images: LightboxImage[]
  createdAt: number
  updatedAt: number
}

export interface LightboxAnnotation {
  id: string
  imageId: string
  annotation: unknown // Annotorious annotation format
  createdAt: number
  updatedAt: number
}

export interface LightboxRegion {
  id: string
  imageId: string
  workspaceId: string
  title: string
  coordinates: {
    x: number
    y: number
    width: number
    height: number
  }
  imageData: string // Base64 or blob URL
  metadata: {
    manuscript?: string
    [key: string]: unknown
  }
  createdAt: number
}

class LightboxDatabase extends Dexie {
  images!: Table<LightboxImage>
  workspaces!: Table<LightboxWorkspace>
  sessions!: Table<LightboxSession>
  annotations!: Table<LightboxAnnotation>
  regions!: Table<LightboxRegion>

  constructor() {
    super('LightboxDatabase')
    this.version(1).stores({
      images: 'id, originalId, type, workspaceId, createdAt',
      workspaces: 'id, createdAt',
      sessions: 'id, name, createdAt',
      annotations: 'id, imageId, createdAt',
      regions: 'id, imageId, workspaceId, createdAt',
    })
  }
}

// Lazy-initialized DB: only created in the browser to avoid SSR/Node errors
let dbInstance: LightboxDatabase | null = null

function getDb(): LightboxDatabase {
  if (typeof window === 'undefined') {
    throw new Error('Lightbox DB is only available in the browser')
  }
  if (!dbInstance) {
    dbInstance = new LightboxDatabase()
  }
  return dbInstance
}

// Helper functions (use getDb() so they only run in browser)
export async function saveImage(image: LightboxImage): Promise<string> {
  return await getDb().images.put(image)
}

export async function getImage(id: string): Promise<LightboxImage | undefined> {
  return await getDb().images.get(id)
}

export async function saveRegion(region: LightboxRegion): Promise<string> {
  return await getDb().regions.put(region)
}

export async function getRegion(id: string): Promise<LightboxRegion | undefined> {
  return await getDb().regions.get(id)
}

export async function getImageRegions(imageId: string): Promise<LightboxRegion[]> {
  return await getDb().regions.where('imageId').equals(imageId).toArray()
}

export async function getWorkspaceRegions(workspaceId: string): Promise<LightboxRegion[]> {
  return await getDb().regions.where('workspaceId').equals(workspaceId).toArray()
}

export async function deleteRegion(id: string): Promise<void> {
  await getDb().regions.delete(id)
}

export async function getWorkspaceImages(workspaceId: string): Promise<LightboxImage[]> {
  return await getDb().images.where('workspaceId').equals(workspaceId).toArray()
}

export async function deleteImage(id: string): Promise<void> {
  const database = getDb()
  await database.images.delete(id)
  await database.annotations.where('imageId').equals(id).delete()
  await database.regions.where('imageId').equals(id).delete()
}

export async function saveWorkspace(workspace: LightboxWorkspace): Promise<string> {
  return await getDb().workspaces.put(workspace)
}

export async function getWorkspace(id: string): Promise<LightboxWorkspace | undefined> {
  return await getDb().workspaces.get(id)
}

export async function getAllWorkspaces(): Promise<LightboxWorkspace[]> {
  return await getDb().workspaces.toArray()
}

export async function deleteWorkspace(id: string): Promise<void> {
  const images = await getWorkspaceImages(id)
  await Promise.all(images.map(img => deleteImage(img.id)))
  await getDb().workspaces.delete(id)
}

export async function saveSession(session: LightboxSession): Promise<string> {
  return await getDb().sessions.put(session)
}

export async function getSession(id: string): Promise<LightboxSession | undefined> {
  return await getDb().sessions.get(id)
}

export async function getAllSessions(): Promise<LightboxSession[]> {
  return await getDb().sessions.orderBy('updatedAt').reverse().toArray()
}

export async function deleteSession(id: string): Promise<void> {
  await getDb().sessions.delete(id)
}

export async function saveAnnotation(annotation: LightboxAnnotation): Promise<string> {
  return await getDb().annotations.put(annotation)
}

export async function getImageAnnotations(imageId: string): Promise<LightboxAnnotation[]> {
  return await getDb().annotations.where('imageId').equals(imageId).toArray()
}

export async function deleteAnnotation(id: string): Promise<void> {
  await getDb().annotations.delete(id)
}
