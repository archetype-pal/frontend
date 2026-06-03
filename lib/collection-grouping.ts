import type { CollectionItem } from './collection-storage';
import {
  getCollectionAllographLabel,
  getCollectionHandLabel,
  getCollectionManuscriptLabel,
} from './collection-display';

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
  if (groupBy === 'allograph') return getCollectionAllographLabel(item);
  if (groupBy === 'hand') return getCollectionHandLabel(item) || 'Unattributed hand';

  const manuscriptLabel = getCollectionManuscriptLabel(item);
  return manuscriptLabel === 'Untitled' && typeof item.item_part === 'number'
    ? `Manuscript #${item.item_part}`
    : manuscriptLabel;
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
