import type { CollectionItem } from './collection-storage';

export type CollectionAnnotationGroupBy = 'none' | 'allograph' | 'hand' | 'manuscript';

export type CollectionAnnotationGroup = {
  key: string;
  label: string;
  items: CollectionItem[];
};

function getGroupLabel(
  item: CollectionItem,
  groupBy: Exclude<CollectionAnnotationGroupBy, 'none'>
) {
  if (groupBy === 'allograph') return item.allograph?.trim() || 'Unspecified allograph';
  if (groupBy === 'hand') return item.hand_name?.trim() || 'Unattributed hand';

  return (
    item.shelfmark?.trim() ||
    (typeof item.item_part === 'number'
      ? `Manuscript #${item.item_part}`
      : 'Unspecified manuscript')
  );
}

export function groupCollectionAnnotations(
  items: CollectionItem[],
  groupBy: CollectionAnnotationGroupBy
): CollectionAnnotationGroup[] {
  if (groupBy === 'none') return [];

  const groups = new Map<string, CollectionAnnotationGroup>();

  for (const item of items) {
    const label = getGroupLabel(item, groupBy);
    const key = label.toLocaleLowerCase();
    const group = groups.get(key);

    if (group) {
      group.items.push(item);
    } else {
      groups.set(key, { key, label, items: [item] });
    }
  }

  return Array.from(groups.values()).sort((a, b) => a.label.localeCompare(b.label));
}
