import type { CollectionItem } from './collection-storage';

function isPubliclyShareableCollectionItem(item: CollectionItem): boolean {
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
