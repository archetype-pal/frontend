import type { LightboxImage, LightboxWorkspace } from '@/lib/lightbox-db';
import {
  coordinatesFromGeoJson,
  fetchIiifImageInfo,
  getIiifImageUrl,
  getIiifImageUrlWithBounds,
} from '@/utils/iiif';
import {
  createCollectionId,
  type CollectionItem,
  type NamedCollection,
} from './collection-storage';
import { getCollectionItemTypeLabel, getCollectionManuscriptLabel } from './collection-display';
import { WORKSET_SCHEMA_VERSION, type WorksetPayload } from '@/types/workset';

const MAX_DEFAULT_DIMENSION = 400;
const GRID_COLUMNS = 2;
const GRID_GAP = 20;

export function isPubliclyShareableCollectionItem(item: CollectionItem): boolean {
  return item.annotation_type !== 'editorial';
}

function toPublicCollectionItem(item: CollectionItem): CollectionItem {
  return {
    id: item.id,
    type: item.type,
    item_part: item.item_part,
    item_image: item.item_image,
    image_iiif: item.image_iiif,
    coordinates: item.coordinates,
    annotation_type: item.annotation_type,
    allograph: item.allograph,
    character: item.character,
    character_type: item.character_type,
    hand_name: item.hand_name,
    shelfmark: item.shelfmark,
    locus: item.locus,
    repository_name: item.repository_name,
    repository_city: item.repository_city,
    date: item.date,
  };
}

export function getPubliclyShareableCollectionItems(items: CollectionItem[]): CollectionItem[] {
  return items.filter(isPubliclyShareableCollectionItem).map(toPublicCollectionItem);
}

function getDefaultSize(naturalWidth: number, naturalHeight: number) {
  let width = MAX_DEFAULT_DIMENSION;
  let height = MAX_DEFAULT_DIMENSION;

  if (naturalWidth > 0 && naturalHeight > 0) {
    const aspect = naturalWidth / naturalHeight;
    if (aspect > 1) {
      height = Math.round(MAX_DEFAULT_DIMENSION / aspect);
    } else {
      width = Math.round(MAX_DEFAULT_DIMENSION * aspect);
    }
  }

  return { width, height };
}

async function buildLightboxImage(
  item: CollectionItem,
  workspaceId: string,
  index: number,
  createdAt: number
): Promise<LightboxImage> {
  const infoUrl = item.image_iiif?.trim() ?? '';
  let imageUrl = '';
  let thumbnailUrl = '';
  let naturalWidth = 0;
  let naturalHeight = 0;

  if (infoUrl && item.type === 'image') {
    imageUrl = getIiifImageUrl(infoUrl, { maxSize: 1200 });
    thumbnailUrl = getIiifImageUrl(infoUrl, { thumbnail: true });
    const info = await fetchIiifImageInfo(infoUrl);
    naturalWidth = info?.width ?? 0;
    naturalHeight = info?.height ?? 0;
  }

  if (infoUrl && item.type === 'graph') {
    const coordinates = coordinatesFromGeoJson(item.coordinates);
    const options = { coordinates: coordinates ?? undefined, flipY: true, maxSize: 1200 };
    [imageUrl, thumbnailUrl] = await Promise.all([
      getIiifImageUrlWithBounds(infoUrl, options),
      getIiifImageUrlWithBounds(infoUrl, { ...options, thumbnail: true }),
    ]);
    naturalWidth = coordinates?.w ?? 0;
    naturalHeight = coordinates?.h ?? 0;
  }

  const column = index % GRID_COLUMNS;
  const row = Math.floor(index / GRID_COLUMNS);

  return {
    id: `${workspaceId}-${item.type}-${item.id}`,
    originalId: item.id,
    type: item.type,
    imageUrl,
    thumbnailUrl,
    metadata: {
      item_type_label: getCollectionItemTypeLabel(item),
      manuscript_label: getCollectionManuscriptLabel(item),
      annotation_type: item.annotation_type,
      shelfmark: item.shelfmark,
      locus: item.locus,
      allograph: item.allograph,
      hand_name: item.hand_name,
      repository_name: item.repository_name,
      repository_city: item.repository_city,
      date: item.date,
    },
    workspaceId,
    position: {
      x: GRID_GAP + column * (MAX_DEFAULT_DIMENSION + GRID_GAP),
      y: GRID_GAP + row * (MAX_DEFAULT_DIMENSION + GRID_GAP),
      zIndex: index + 1,
    },
    size: getDefaultSize(naturalWidth, naturalHeight),
    transform: {
      opacity: 1,
      brightness: 100,
      contrast: 100,
      rotation: 0,
      flipX: false,
      flipY: false,
      grayscale: false,
    },
    createdAt,
    updatedAt: createdAt,
  };
}

export async function buildCollectionWorksetPayload(
  collection: NamedCollection
): Promise<WorksetPayload> {
  const items = getPubliclyShareableCollectionItems(collection.items);
  const workspaceId = `collection-${createCollectionId()}`;
  const createdAt = Date.now();
  const images = await Promise.all(
    items.map((item, index) => buildLightboxImage(item, workspaceId, index, createdAt))
  );
  const workspace: LightboxWorkspace = {
    id: workspaceId,
    name: collection.name,
    images: images.map((image) => image.id),
    createdAt,
    updatedAt: createdAt,
  };

  return {
    schema_version: WORKSET_SCHEMA_VERSION,
    workspaces: [workspace],
    images,
    collection: {
      schema_version: 1,
      name: collection.name,
      items,
    },
  };
}
