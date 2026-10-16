import type { CollectionItem } from '@/lib/collection-storage';
import type { ClauseListItem } from '@/types/search';
import type { BackendGraph } from '@/services/annotations';

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

interface GraphCollectionContext {
  itemPartId: number;
  itemImageId: number;
  iiifImage: string;
  locus: string;
  shelfmark: string;
}

interface GraphCollectionLabels {
  allographLabelById: ReadonlyMap<number, string>;
  handNameById: ReadonlyMap<number, string>;
}

/** Shared by the image Annotations tab and the hand Graphs tab, so both store the same entry. */
export function graphToCollectionItem(
  graph: BackendGraph,
  ctx: GraphCollectionContext,
  labels: GraphCollectionLabels
): CollectionItem {
  return {
    id: graph.id,
    type: 'graph',
    item_part: ctx.itemPartId,
    item_image: ctx.itemImageId,
    image_iiif: ctx.iiifImage,
    coordinates: JSON.stringify(graph.annotation),
    annotation_type: graph.annotation_type,
    allograph:
      graph.allograph === null ? undefined : labels.allographLabelById.get(graph.allograph),
    hand_name: graph.hand === null ? undefined : labels.handNameById.get(graph.hand),
    shelfmark: ctx.shelfmark,
    locus: ctx.locus,
  };
}
