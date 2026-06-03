import {
  getCollectionAllographLabel,
  getCollectionItemCaption,
  getCollectionManuscriptLabel,
  isCollectionEditorialAnnotation,
  type CollectionDisplayInput,
} from './collection-display';
import type { LightboxImage } from './lightbox-db';

function getMetadataString(image: LightboxImage, key: string): string | undefined {
  const value = image.metadata[key];
  return typeof value === 'string' && value.trim() ? value : undefined;
}

export function getLightboxDisplayItem(image: LightboxImage): CollectionDisplayInput {
  return {
    type: image.type,
    annotation_type: getMetadataString(image, 'annotation_type'),
    allograph: getMetadataString(image, 'allograph'),
    hand_name: getMetadataString(image, 'hand_name'),
    shelfmark: getMetadataString(image, 'shelfmark'),
    locus: getMetadataString(image, 'locus'),
    repository_name: getMetadataString(image, 'repository_name'),
    repository_city: getMetadataString(image, 'repository_city'),
    date: getMetadataString(image, 'date'),
  };
}

export function getLightboxImageLabel(image: LightboxImage): string {
  return getCollectionManuscriptLabel(getLightboxDisplayItem(image));
}

export function getLightboxImageCaption(image: LightboxImage): string {
  return getCollectionItemCaption(getLightboxDisplayItem(image));
}

export function getLightboxGraphMetadataLine(image: LightboxImage): string {
  if (image.type !== 'graph') return '';

  const item = getLightboxDisplayItem(image);
  if (isCollectionEditorialAnnotation(item)) return '';

  return [getCollectionAllographLabel(item), item.hand_name].filter(Boolean).join(' · ');
}
