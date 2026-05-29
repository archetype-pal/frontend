import { describe, expect, it } from 'vitest';

import {
  annotationCountLabel,
  buildAnnotationCollectionItem,
  buildImageCollectionItem,
  countPhrase,
  formatSavedAnnotationDescription,
  joinCountPhrases,
  type ViewerCollectionContext,
} from './manuscript-viewer-collection';

const ctx: ViewerCollectionContext = {
  itemPartId: 268,
  itemImageId: 4432,
  iiifImage: 'http://iiif/x',
  locus: '1r',
  shelfmark: 'RRS i 34',
  repositoryName: 'NRS',
  repositoryCity: 'Edinburgh',
  date: '1200',
};

describe('count phrasing', () => {
  it('pluralizes annotationCountLabel', () => {
    expect(annotationCountLabel(1)).toBe('1 annotation');
    expect(annotationCountLabel(3)).toBe('3 annotations');
  });

  it('countPhrase picks singular/plural', () => {
    expect(countPhrase(1, 'item', 'items')).toBe('1 item');
    expect(countPhrase(2, 'item', 'items')).toBe('2 items');
  });

  it('joinCountPhrases uses Oxford-comma joining', () => {
    expect(joinCountPhrases([])).toBe('');
    expect(joinCountPhrases(['a'])).toBe('a');
    expect(joinCountPhrases(['a', 'b'])).toBe('a and b');
    expect(joinCountPhrases(['a', 'b', 'c'])).toBe('a, b, and c');
  });
});

describe('formatSavedAnnotationDescription', () => {
  it('summarizes created/updated/deleted counts', () => {
    expect(
      formatSavedAnnotationDescription({ createdCount: 2, updatedCount: 0, deletedCount: 1 })
    ).toBe('Saved 2 created annotations and 1 deleted annotation.');
  });

  it('reports nothing-to-save when all zero', () => {
    expect(
      formatSavedAnnotationDescription({ createdCount: 0, updatedCount: 0, deletedCount: 0 })
    ).toBe('No annotation changes to save.');
  });
});

describe('buildImageCollectionItem', () => {
  it('maps the context into an image collection item', () => {
    expect(buildImageCollectionItem(ctx)).toMatchObject({
      id: 4432,
      type: 'image',
      item_part: 268,
      item_image: 4432,
      shelfmark: 'RRS i 34',
    });
  });
});

describe('buildAnnotationCollectionItem', () => {
  it('returns null when the annotation has no backend id', () => {
    const result = buildAnnotationCollectionItem(
      { id: 'not-a-db-id', target: {} } as never,
      1000,
      ctx
    );
    expect(result).toBeNull();
  });
});
