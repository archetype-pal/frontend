import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import {
  getIiifImageUrl,
  getIiifImageUrlWithBounds,
  fetchIiifImageInfo,
  coordinatesFromGeoJson,
} from '@/utils/iiif';
import type { LightboxImage, LightboxWorkspace } from '@/lib/lightbox-db';
import type { GraphListItem, ImageListItem } from '@/types/search';
import type { CollectionItem } from '@/contexts/collection-context';
import type { WorksetPayload } from '@/types/workset';
import { getCollectionItemTypeLabel, getCollectionManuscriptLabel } from '@/lib/collection-display';

export interface LightboxState {
  // Current workspace
  currentWorkspaceId: string | null;
  workspaces: LightboxWorkspace[];
  images: Map<string, LightboxImage>;

  // UI state
  isLoading: boolean;
  error: string | null;
  selectedImageIds: Set<string>;

  // Viewer state
  zoom: number;
  showAnnotations: boolean;
  showGrid: boolean;

  // History for undo/redo
  history: Array<{
    workspaces: LightboxWorkspace[];
    images: Map<string, LightboxImage>;
  }>;
  historyIndex: number;

  // Actions
  initialize: () => Promise<void>;
  setCurrentWorkspace: (workspaceId: string | null) => void;
  createWorkspace: (name?: string) => Promise<string>;
  deleteWorkspace: (workspaceId: string) => Promise<void>;
  loadImage: (
    item: CollectionItem | ImageListItem | GraphListItem,
    batchOffset?: number
  ) => Promise<string>;
  loadImages: (items: (CollectionItem | ImageListItem | GraphListItem)[]) => Promise<string[]>;
  removeImage: (imageId: string) => Promise<void>;
  updateImage: (imageId: string, updates: Partial<LightboxImage>) => Promise<void>;
  updateImages: (updates: Map<string, Partial<LightboxImage>>) => void;
  selectImage: (imageId: string) => void;
  deselectImage: (imageId: string) => void;
  selectAll: () => void;
  deselectAll: () => void;
  setZoom: (zoom: number) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  loadSession: (sessionId: string) => Promise<void>;
  /**
   * Hydrate the store from a server workset payload. `persist` writes the
   * workspaces/images into Dexie (used when the OWNER loads a workset to keep
   * editing); the public read-only citable view passes `persist: false` so the
   * viewed workset stays ephemeral and never clobbers the visitor's own
   * local lightbox.
   */
  loadWorksetPayload: (payload: WorksetPayload, options?: { persist?: boolean }) => Promise<void>;
  setShowAnnotations: (show: boolean) => void;
  setShowGrid: (show: boolean) => void;
  bringToFront: (imageId: string) => void;
  sendToBack: (imageId: string) => void;
  moveUp: (imageId: string) => void;
  moveDown: (imageId: string) => void;
  undo: () => void;
  redo: () => void;
  saveHistory: () => void;
}

// Debounce timer for batched IndexedDB writes (used by updateImages). Pending
// changes accumulate in a module-level Map keyed by image id so that coalescing
// across rapid calls (e.g. a selection change mid-debounce) never discards an
// earlier batch — the whole accumulated set is flushed when the timer fires.
let persistTimer: ReturnType<typeof setTimeout> | null = null;
const pendingPersist = new Map<string, LightboxImage>();

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

function createWorkspaceId(): string {
  return `workspace-${generateId()}`;
}

function createImageId(): string {
  return `image-${generateId()}`;
}

// Initialize store with data from IndexedDB. Throws on failure so caller can set error (fail loud).
async function initializeStore(): Promise<{
  workspaces: LightboxWorkspace[];
  images: Map<string, LightboxImage>;
}> {
  const { getAllWorkspaces, getWorkspaceImages, saveImage } = await import('@/lib/lightbox-db');
  const workspaces = await getAllWorkspaces();
  const imagesMap = new Map<string, LightboxImage>();

  // One-time migration: fix stale URLs, sizes, and positions from old lightbox data
  const MIGRATION_VERSION = 2;
  const MIGRATION_KEY = 'lightbox-migration-version';
  const currentVersion = Number(
    typeof localStorage !== 'undefined' ? (localStorage.getItem(MIGRATION_KEY) ?? '0') : '0'
  );
  const needsMigration = currentVersion < MIGRATION_VERSION;
  const migrationWrites: Promise<unknown>[] = [];

  for (const workspace of workspaces) {
    const workspaceImages = await getWorkspaceImages(workspace.id);

    if (needsMigration && workspaceImages.length > 0) {
      const MAX_DIM = 400;
      const GAP = 20;
      const COLS = 2;
      workspaceImages.forEach((img, idx) => {
        // Fix stale full/max URLs
        if (img.imageUrl?.includes('/full/max/')) {
          img.imageUrl = img.imageUrl.replace('/full/max/', '/full/!1200,1200/');
        }
        // Fix oversized containers
        if (img.size.width > MAX_DIM * 1.5 || img.size.height > MAX_DIM * 1.5) {
          img.size = { width: MAX_DIM, height: MAX_DIM };
        }
        // Re-layout all images into a 2-col grid (fits any viewport)
        const col = idx % COLS;
        const row = Math.floor(idx / COLS);
        img.position = {
          ...img.position,
          x: GAP + col * (MAX_DIM + GAP),
          y: GAP + row * (MAX_DIM + GAP),
        };
        migrationWrites.push(saveImage(img));
      });
    }

    for (const img of workspaceImages) {
      imagesMap.set(img.id, img);
    }
  }

  // Only advance the migration version once every persisted write succeeds.
  // If any write rejects (quota/transaction abort), leave the version untouched
  // so the migration retries on the next load instead of silently committing a
  // partial migration. Awaiting also stops the version bump from racing the puts.
  if (needsMigration && typeof localStorage !== 'undefined') {
    try {
      await Promise.all(migrationWrites);
      localStorage.setItem(MIGRATION_KEY, String(MIGRATION_VERSION));
    } catch {
      // Persistence failed — keep the old version so we retry next time.
    }
  }

  return { workspaces, images: imagesMap };
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
    set({ isLoading: true });
    try {
      const { workspaces, images } = await initializeStore();
      set({
        workspaces,
        images,
        currentWorkspaceId: workspaces.length > 0 ? workspaces[0].id : null,
        isLoading: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to initialize',
        isLoading: false,
      });
    }
  },

  setCurrentWorkspace: (workspaceId) => {
    set({ currentWorkspaceId: workspaceId, selectedImageIds: new Set() });
  },

  createWorkspace: async (name) => {
    get().saveHistory();

    const workspaceId = createWorkspaceId();
    const workspace: LightboxWorkspace = {
      id: workspaceId,
      name: name || `Workspace ${get().workspaces.length + 1}`,
      images: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    set((state) => ({
      workspaces: [...state.workspaces, workspace],
      currentWorkspaceId: workspaceId,
    }));

    // Save to IndexedDB
    const { saveWorkspace } = await import('@/lib/lightbox-db');
    await saveWorkspace(workspace);

    return workspaceId;
  },

  deleteWorkspace: async (workspaceId) => {
    const { deleteWorkspace: deleteWorkspaceDb } = await import('@/lib/lightbox-db');
    await deleteWorkspaceDb(workspaceId);

    set((state) => {
      const workspaces = state.workspaces.filter((w) => w.id !== workspaceId);
      const images = new Map(state.images);

      // Remove images from this workspace
      state.images.forEach((img, id) => {
        if (img.workspaceId === workspaceId) {
          images.delete(id);
        }
      });

      return {
        workspaces,
        images,
        currentWorkspaceId:
          state.currentWorkspaceId === workspaceId ? null : state.currentWorkspaceId,
      };
    });
  },

  loadImage: async (item, batchOffset = 0) => {
    let workspaceId = get().currentWorkspaceId;

    // Create workspace if none exists
    if (!workspaceId) {
      workspaceId = await get().createWorkspace();
    }

    const imageId = createImageId();
    const type = 'type' in item ? item.type : 'image' in item ? 'image' : 'graph';

    // Build IIIF image URLs from image_iiif (and coordinates for graphs)
    let imageUrl = '';
    let thumbnailUrl = '';
    let naturalWidth = 0;
    let naturalHeight = 0;

    if (type === 'image') {
      const imgItem = item as ImageListItem | CollectionItem;
      const infoUrl =
        (imgItem as ImageListItem).image_iiif ?? (imgItem as CollectionItem).image_iiif ?? '';
      if (infoUrl) {
        imageUrl = getIiifImageUrl(infoUrl, { maxSize: 1200 });
        thumbnailUrl = getIiifImageUrl(infoUrl, { thumbnail: true });
        // Fetch info.json for aspect ratio (cached, fast)
        const info = await fetchIiifImageInfo(infoUrl);
        if (info) {
          naturalWidth = info.width;
          naturalHeight = info.height;
        }
      }
    } else {
      const graphItem = item as GraphListItem | CollectionItem;
      const infoUrl =
        (graphItem as GraphListItem).image_iiif ?? (graphItem as CollectionItem).image_iiif ?? '';
      const coords =
        (graphItem as GraphListItem).coordinates != null
          ? coordinatesFromGeoJson((graphItem as GraphListItem).coordinates)
          : (graphItem as CollectionItem).coordinates != null
            ? coordinatesFromGeoJson(String((graphItem as CollectionItem).coordinates))
            : undefined;
      if (infoUrl) {
        const opts = { coordinates: coords ?? undefined, flipY: true, maxSize: 1200 };
        try {
          [imageUrl, thumbnailUrl] = await Promise.all([
            getIiifImageUrlWithBounds(infoUrl, opts),
            getIiifImageUrlWithBounds(infoUrl, { ...opts, thumbnail: true }),
          ]);
        } catch {
          // info.json unavailable, so the region can't be Y-flipped correctly.
          // Fall back to the uncropped image (right orientation) rather than
          // letting one image reject the whole batch load.
          const full = { ...opts, coordinates: undefined, flipY: false };
          [imageUrl, thumbnailUrl] = await Promise.all([
            getIiifImageUrlWithBounds(infoUrl, full),
            getIiifImageUrlWithBounds(infoUrl, { ...full, thumbnail: true }),
          ]);
        }
        // Use coordinate dimensions for graphs
        if (coords) {
          naturalWidth = coords.w;
          naturalHeight = coords.h;
        }
      }
    }

    if (!imageUrl && process.env.NODE_ENV === 'development') {
      console.warn(
        `[Lightbox] No image URL resolved for ${type} id=${item.id}. ` +
          `image_iiif=${JSON.stringify((item as Record<string, unknown>).image_iiif)}`
      );
    }

    // Compute aspect-correct default size
    const MAX_DEFAULT_DIM = 400;
    let width = MAX_DEFAULT_DIM;
    let height = MAX_DEFAULT_DIM;
    if (naturalWidth > 0 && naturalHeight > 0) {
      const aspect = naturalWidth / naturalHeight;
      if (aspect > 1) {
        height = Math.round(MAX_DEFAULT_DIM / aspect);
      } else {
        width = Math.round(MAX_DEFAULT_DIM * aspect);
      }
    }

    // Tiling layout: place images in a grid instead of random positions.
    // Re-read state AFTER the awaits above (info.json fetch / URL building) so a
    // concurrent batch via loadImages doesn't all see the same pre-await
    // snapshot. `batchOffset` further disambiguates images added in the same
    // batch, which haven't committed their set() yet when this math runs, so
    // each lands in a distinct cell with a distinct z-index instead of stacking.
    const postAwaitState = get();
    const existingCount =
      Array.from(postAwaitState.images.values()).filter((img) => img.workspaceId === workspaceId)
        .length + batchOffset;
    const COLS = 2;
    const GAP = 20;
    const col = existingCount % COLS;
    const row = Math.floor(existingCount / COLS);
    const posX = GAP + col * (MAX_DEFAULT_DIM + GAP);
    const posY = GAP + row * (MAX_DEFAULT_DIM + GAP);
    const zIndex = postAwaitState.images.size + 1 + batchOffset;
    const displayItem = {
      ...(item as Record<string, unknown>),
      type,
    } as CollectionItem;

    const lightboxImage: LightboxImage = {
      id: imageId,
      originalId: typeof item.id === 'number' ? item.id : 0,
      type: type as 'image' | 'graph',
      imageUrl,
      thumbnailUrl,
      metadata: {
        item_type_label: getCollectionItemTypeLabel(displayItem),
        manuscript_label: getCollectionManuscriptLabel(displayItem),
        annotation_type:
          'annotation_type' in item && item.annotation_type != null
            ? String(item.annotation_type)
            : undefined,
        display_label:
          displayItem.display_label != null ? String(displayItem.display_label) : undefined,
        shelfmark: item.shelfmark != null ? String(item.shelfmark) : undefined,
        locus: 'locus' in item && item.locus != null ? String(item.locus) : undefined,
        allograph:
          'allograph' in item && item.allograph != null ? String(item.allograph) : undefined,
        hand_name:
          'hand_name' in item && item.hand_name != null ? String(item.hand_name) : undefined,
        repository_name: item.repository_name != null ? String(item.repository_name) : undefined,
        repository_city: item.repository_city != null ? String(item.repository_city) : undefined,
        date: item.date != null ? String(item.date) : undefined,
      },
      workspaceId,
      position: {
        x: posX,
        y: posY,
        zIndex,
      },
      size: { width, height },
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
    };

    // Persist to IndexedDB and update state in parallel
    const { saveImage, saveWorkspace } = await import('@/lib/lightbox-db');
    const workspace = postAwaitState.workspaces.find((w) => w.id === workspaceId);
    const updatedWorkspace = workspace
      ? { ...workspace, images: [...workspace.images, imageId], updatedAt: Date.now() }
      : null;

    await Promise.all([
      saveImage(lightboxImage),
      updatedWorkspace ? saveWorkspace(updatedWorkspace) : Promise.resolve(),
    ]);

    set((state) => {
      const images = new Map(state.images);
      images.set(imageId, lightboxImage);
      const workspaces = updatedWorkspace
        ? state.workspaces.map((w) => (w.id === workspaceId ? updatedWorkspace : w))
        : state.workspaces;
      return { images, workspaces };
    });

    return imageId;
  },

  loadImages: async (items) => {
    // Pass each item's batch index as an offset so concurrent loadImage calls,
    // which all read the same pre-batch snapshot, still land in distinct grid
    // cells with distinct z-indices instead of stacking on the same position.
    return Promise.all(items.map((item, index) => get().loadImage(item, index)));
  },

  removeImage: async (imageId) => {
    // Save history before removal
    get().saveHistory();

    const { deleteImage } = await import('@/lib/lightbox-db');
    await deleteImage(imageId);

    set((state) => {
      const images = new Map(state.images);
      images.delete(imageId);

      // Update workspace
      const workspaces = state.workspaces.map((w) => {
        if (w.images.includes(imageId)) {
          return {
            ...w,
            images: w.images.filter((id) => id !== imageId),
            updatedAt: Date.now(),
          };
        }
        return w;
      });

      return { images, workspaces };
    });
  },

  updateImage: async (imageId, updates) => {
    const state = get();
    const image = state.images.get(imageId);
    if (!image) return;

    const updated = {
      ...image,
      ...updates,
      updatedAt: Date.now(),
    };

    set((state) => {
      const images = new Map(state.images);
      images.set(imageId, updated);
      return { images };
    });

    const { saveImage } = await import('@/lib/lightbox-db');
    await saveImage(updated);
  },

  updateImages: (updates) => {
    const state = get();
    const now = Date.now();
    const images = new Map(state.images);
    const changed: LightboxImage[] = [];

    for (const [imageId, partial] of updates) {
      const image = images.get(imageId);
      if (!image) continue;
      const updated = { ...image, ...partial, updatedAt: now };
      images.set(imageId, updated);
      changed.push(updated);
    }

    set({ images });

    // Debounced IndexedDB persist. Merge this call's changes into the shared
    // pending map so a later call within the 300ms window can't drop an earlier
    // batch — every accumulated image is flushed when the timer finally fires.
    for (const img of changed) {
      pendingPersist.set(img.id, img);
    }

    if (persistTimer) clearTimeout(persistTimer);
    persistTimer = setTimeout(async () => {
      persistTimer = null;
      const toPersist = Array.from(pendingPersist.values());
      pendingPersist.clear();
      const { saveImage } = await import('@/lib/lightbox-db');
      await Promise.all(toPersist.map((img) => saveImage(img)));
    }, 300);
  },

  selectImage: (imageId) => {
    set((state) => {
      const selected = new Set(state.selectedImageIds);
      selected.add(imageId);
      return { selectedImageIds: selected };
    });
  },

  deselectImage: (imageId) => {
    set((state) => {
      const selected = new Set(state.selectedImageIds);
      selected.delete(imageId);
      return { selectedImageIds: selected };
    });
  },

  selectAll: () => {
    const state = get();
    const allIds = Array.from(state.images.keys()).filter(
      (id) => state.images.get(id)?.workspaceId === state.currentWorkspaceId
    );
    set({ selectedImageIds: new Set(allIds) });
  },

  deselectAll: () => {
    set({ selectedImageIds: new Set() });
  },

  setZoom: (zoom) => {
    set({ zoom });
  },

  setLoading: (loading) => {
    set({ isLoading: loading });
  },

  setError: (error) => {
    set({ error });
  },

  clearError: () => {
    set({ error: null });
  },

  loadSession: async (sessionId) => {
    set({ isLoading: true });
    try {
      const { getSession } = await import('@/lib/lightbox-db');
      const session = await getSession(sessionId);

      if (!session) {
        throw new Error('Session not found');
      }

      // Replace the persisted working set with the session's data (atomically),
      // rather than merging via per-row put — otherwise any workspace/image that
      // belongs to the previous set but not this session stays orphaned in Dexie
      // and resurfaces on the next reload (initialize() reads ALL workspaces).
      const { replaceWorkingSet } = await import('@/lib/lightbox-db');
      await replaceWorkingSet(session.workspaces, session.images);

      const imagesMap = new Map<string, LightboxImage>();
      for (const image of session.images) {
        imagesMap.set(image.id, image);
      }

      // Set first workspace as current
      const firstWorkspaceId = session.workspaces[0]?.id || null;

      set({
        workspaces: session.workspaces,
        images: imagesMap,
        currentWorkspaceId: firstWorkspaceId,
        isLoading: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load session',
        isLoading: false,
      });
    }
  },

  loadWorksetPayload: async (payload, options) => {
    const persist = options?.persist ?? false;
    set({ isLoading: true });
    try {
      const workspaces = payload?.workspaces ?? [];
      const images = payload?.images ?? [];

      if (persist) {
        // Replace (not merge) the persisted working set so loading a workset
        // fully supplants the local lightbox instead of unioning with whatever
        // workspaces/images were already persisted (which would resurface on
        // the next reload via initialize()).
        const { replaceWorkingSet } = await import('@/lib/lightbox-db');
        await replaceWorkingSet(workspaces, images);
      }

      const imagesMap = new Map<string, LightboxImage>();
      for (const image of images) imagesMap.set(image.id, image);

      set({
        workspaces,
        images: imagesMap,
        currentWorkspaceId: workspaces[0]?.id ?? null,
        selectedImageIds: new Set(),
        isLoading: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load workset',
        isLoading: false,
      });
    }
  },

  setShowAnnotations: (show) => {
    set({ showAnnotations: show });
  },

  setShowGrid: (show) => {
    set({ showGrid: show });
  },

  bringToFront: (imageId) => {
    get().saveHistory();
    const state = get();
    let maxZ = 0;
    state.images.forEach((img) => {
      if (img.position.zIndex > maxZ) maxZ = img.position.zIndex;
    });
    const image = state.images.get(imageId);
    if (image && image.position.zIndex < maxZ) {
      get().updateImage(imageId, { position: { ...image.position, zIndex: maxZ + 1 } });
    }
  },

  sendToBack: (imageId) => {
    get().saveHistory();
    const state = get();
    let minZ = Infinity;
    state.images.forEach((img) => {
      if (img.position.zIndex < minZ) minZ = img.position.zIndex;
    });
    const image = state.images.get(imageId);
    if (image && image.position.zIndex > minZ) {
      get().updateImage(imageId, {
        position: { ...image.position, zIndex: Math.max(0, minZ - 1) },
      });
    }
  },

  moveUp: (imageId) => {
    get().saveHistory();
    const state = get();
    const image = state.images.get(imageId);
    if (!image) return;
    // Find the next higher zIndex
    let nextZ = Infinity;
    let swapId: string | null = null;
    state.images.forEach((img, id) => {
      if (img.position.zIndex > image.position.zIndex && img.position.zIndex < nextZ) {
        nextZ = img.position.zIndex;
        swapId = id;
      }
    });
    if (swapId) {
      const swapImg = state.images.get(swapId)!;
      get().updateImage(imageId, {
        position: { ...image.position, zIndex: swapImg.position.zIndex },
      });
      get().updateImage(swapId, {
        position: { ...swapImg.position, zIndex: image.position.zIndex },
      });
    }
  },

  moveDown: (imageId) => {
    get().saveHistory();
    const state = get();
    const image = state.images.get(imageId);
    if (!image) return;
    // Find the next lower zIndex
    let prevZ = -Infinity;
    let swapId: string | null = null;
    state.images.forEach((img, id) => {
      if (img.position.zIndex < image.position.zIndex && img.position.zIndex > prevZ) {
        prevZ = img.position.zIndex;
        swapId = id;
      }
    });
    if (swapId) {
      const swapImg = state.images.get(swapId)!;
      get().updateImage(imageId, {
        position: { ...image.position, zIndex: swapImg.position.zIndex },
      });
      get().updateImage(swapId, {
        position: { ...swapImg.position, zIndex: image.position.zIndex },
      });
    }
  },

  saveHistory: () => {
    const state = get();
    const snapshot = {
      workspaces: JSON.parse(JSON.stringify(state.workspaces)),
      images: new Map(state.images),
    };

    set((state) => {
      const newHistory = state.history.slice(0, state.historyIndex + 1);
      newHistory.push(snapshot);
      // Keep last 50 history entries
      const trimmedHistory = newHistory.slice(-50);
      return {
        history: trimmedHistory,
        historyIndex: trimmedHistory.length - 1,
      };
    });
  },

  undo: () => {
    const state = get();
    if (state.historyIndex >= 0 && state.history[state.historyIndex]) {
      const prevState = state.history[state.historyIndex];
      set({
        workspaces: prevState.workspaces,
        images: prevState.images,
        historyIndex: state.historyIndex - 1,
      });
    }
  },

  redo: () => {
    const state = get();
    if (state.historyIndex < state.history.length - 1) {
      const nextState = state.history[state.historyIndex + 1];
      set({
        workspaces: nextState.workspaces,
        images: nextState.images,
        historyIndex: state.historyIndex + 1,
      });
    }
  },
}));

const EMPTY_IMAGES: LightboxImage[] = [];

/**
 * Images in the current workspace. Subscribes via `useShallow` over the computed
 * array so a consumer only re-renders when ITS slice actually changes — an
 * unrelated image edit still allocates a new `images` Map, but the derived
 * filtered array stays shallow-equal and the subscription is skipped.
 */
export function useWorkspaceImages(): LightboxImage[] {
  return useLightboxStore(
    useShallow((s) => {
      if (!s.currentWorkspaceId) return EMPTY_IMAGES;
      return Array.from(s.images.values()).filter(
        (img) => img.workspaceId === s.currentWorkspaceId
      );
    })
  );
}

/**
 * Selected images (resolved from selectedImageIds). Subscribes via `useShallow`
 * over the computed array so consumers only re-render when their resolved
 * selection actually changes, not on every per-image Map replacement.
 */
export function useSelectedImages(): LightboxImage[] {
  return useLightboxStore(
    useShallow((s) => {
      if (s.selectedImageIds.size === 0) return EMPTY_IMAGES;
      const result: LightboxImage[] = [];
      for (const id of s.selectedImageIds) {
        const img = s.images.get(id);
        if (img) result.push(img);
      }
      return result;
    })
  );
}
