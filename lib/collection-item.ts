import type { CollectionItem } from '@/lib/collection-storage';
import type { ClauseListItem } from '@/types/search';

/**
 * A clause can be collected only when it has a connected graph (image region).
 * What gets stored is that graph — so the collection holds the region image,
 * never the clause text. Returns null when the clause has no renderable
 * connected graph (no annotation id, coordinates, or IIIF source).
 */
export function clauseToGraphCollectionItem(clause: ClauseListItem): CollectionItem | null {
  const coordinates = clause.annotation_coordinates?.trim();
  const imageIiif = clause.thumbnail_iiif?.trim();
  if (clause.annotation_id == null || !coordinates || !imageIiif) return null;

  return {
    id: clause.annotation_id,
    type: 'graph',
    item_part: clause.item_part,
    item_image: clause.item_image,
    image_iiif: imageIiif,
    coordinates,
    annotation_type: clause.clause_type,
    shelfmark: clause.shelfmark,
    locus: clause.locus,
    repository_name: clause.repository_name,
    repository_city: clause.repository_city,
    date: clause.date ?? undefined,
  };
}
