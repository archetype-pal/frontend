import type { CollectionItem } from './collection-storage';

export type CollectionDisplaySectionType = 'image' | 'annotation' | 'editorial';

export type CollectionDisplayInput = Partial<
  Pick<
    CollectionItem,
    | 'type'
    | 'annotation_type'
    | 'allograph'
    | 'hand_name'
    | 'shelfmark'
    | 'locus'
    | 'repository_name'
    | 'repository_city'
    | 'date'
  >
>;

const REPOSITORY_SHELFMARK_SHORTHANDS: Record<string, string> = {
  bl: 'BL',
  'british library': 'BL',
  'the british library': 'BL',
  nrs: 'NRS',
  'national records of scotland': 'NRS',
  tna: 'TNA',
  'national archives': 'TNA',
  'the national archives': 'TNA',
};

function clean(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function isCollectionEditorialAnnotation(item: CollectionDisplayInput): boolean {
  return item.type === 'graph' && item.annotation_type === 'editorial';
}

export function getCollectionDisplaySectionType(
  item: CollectionDisplayInput
): CollectionDisplaySectionType {
  if (item.type === 'image') return 'image';
  return isCollectionEditorialAnnotation(item) ? 'editorial' : 'annotation';
}

export function getCollectionDisplaySectionLabel(sectionType: CollectionDisplaySectionType) {
  if (sectionType === 'image') return 'Images';
  if (sectionType === 'editorial') return 'Editorial Annotations';
  return 'Graphs';
}

export function getCollectionItemTypeLabel(item: CollectionDisplayInput): string {
  if (item.type === 'image') return 'Page image';
  return isCollectionEditorialAnnotation(item) ? 'Editorial annotation' : 'Allograph';
}

export function getCollectionDisplayShelfmark(item: CollectionDisplayInput): string {
  const shelfmark = clean(item.shelfmark);
  if (!shelfmark) return '';

  const repositoryName = clean(item.repository_name).toLocaleLowerCase();
  const shorthand = repositoryName ? REPOSITORY_SHELFMARK_SHORTHANDS[repositoryName] : undefined;
  if (!shorthand) return shelfmark;

  const lowerShelfmark = shelfmark.toLocaleLowerCase();
  const lowerShorthand = shorthand.toLocaleLowerCase();
  if (lowerShelfmark === lowerShorthand || lowerShelfmark.startsWith(`${lowerShorthand} `)) {
    return shelfmark;
  }

  return `${shorthand} ${shelfmark}`;
}

export function getCollectionManuscriptLabel(item: CollectionDisplayInput): string {
  const shelfmark = getCollectionDisplayShelfmark(item);
  const locus = clean(item.locus);

  if (shelfmark && locus) return `${shelfmark}: ${locus}`;
  if (shelfmark) return shelfmark;
  if (locus) return locus;
  return 'Untitled';
}

export function getCollectionAllographLabel(item: CollectionDisplayInput): string {
  return clean(item.allograph) || 'Unspecified allograph';
}

export function getCollectionHandLabel(item: CollectionDisplayInput): string {
  return clean(item.hand_name);
}

export function getCollectionItemCaption(item: CollectionDisplayInput): string {
  const parts = [getCollectionItemTypeLabel(item), getCollectionManuscriptLabel(item)];

  if (item.type === 'graph' && !isCollectionEditorialAnnotation(item)) {
    parts.push(getCollectionAllographLabel(item));

    const hand = getCollectionHandLabel(item);
    if (hand) parts.push(hand);
  }

  return parts.filter(Boolean).join(' · ');
}
