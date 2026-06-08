import type { GraphListItem, ImageListItem } from '@/types/search';
import type { CollectionItem } from '@/contexts/collection-context';

type LightboxSourceItem = ImageListItem | GraphListItem | CollectionItem;

export function getLightboxItemType(item: LightboxSourceItem): 'image' | 'graph' {
  if ('type' in item && (item.type === 'image' || item.type === 'graph')) return item.type;
  if ('coordinates' in item) return 'graph';
  return 'image';
}

/**
 * Build a lightbox URL for a single image.
 */
export function getLightboxImageUrl(imageId: number) {
  return `/lightbox?image=${imageId}`;
}

/**
 * Build a lightbox URL for a single graph.
 */
export function getLightboxGraphUrl(graphId: number) {
  return `/lightbox?graph=${graphId}`;
}

/**
 * Build a lightbox URL for selected items (images and/or graphs).
 */
export function getLightboxItemsUrl(items: LightboxSourceItem[]) {
  const images: number[] = [];
  const graphs: number[] = [];

  items.forEach((item) => {
    const type = getLightboxItemType(item);
    if (type === 'image') {
      images.push(item.id);
    } else {
      graphs.push(item.id);
    }
  });

  const params = new URLSearchParams();
  if (images.length > 0) {
    params.set('images', images.join(','));
  }
  if (graphs.length > 0) {
    params.set('graphs', graphs.join(','));
  }

  return `/lightbox?${params.toString()}`;
}

/**
 * Open lightbox with selected items (images and/or graphs).
 */
export function openLightboxWithItems(items: LightboxSourceItem[]) {
  window.location.href = getLightboxItemsUrl(items);
}
