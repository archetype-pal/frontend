import { describe, expect, it } from 'vitest';

import { clauseToGraphCollectionItem } from '@/lib/collection-item';
import type { ClauseListItem } from '@/types/search';

function makeClause(overrides: Partial<ClauseListItem> = {}): ClauseListItem {
  return {
    id: '42_3',
    clause_type: 'disposition',
    content: 'sciatis me dedisse',
    item_image: 7,
    item_part: 11,
    text_type: 'transcription',
    repository_city: 'Edinburgh',
    repository_name: 'NRS',
    shelfmark: 'GD55/1',
    date: 'c. 1200',
    date_min: 1190,
    date_max: 1210,
    catalogue_numbers: 'No. 1',
    locus: 'recto',
    type: 'charter',
    status: 'published',
    thumbnail_iiif: 'https://iiif.example/img/info.json',
    annotation_id: 99,
    annotation_coordinates: '10,20,30,40',
    ...overrides,
  };
}

describe('clauseToGraphCollectionItem', () => {
  it('maps a clause with a connected graph to a graph collection item', () => {
    const item = clauseToGraphCollectionItem(makeClause());
    expect(item).toEqual({
      id: 99,
      type: 'graph',
      item_part: 11,
      item_image: 7,
      image_iiif: 'https://iiif.example/img/info.json',
      coordinates: '10,20,30,40',
      annotation_type: 'disposition',
      shelfmark: 'GD55/1',
      locus: 'recto',
      repository_name: 'NRS',
      repository_city: 'Edinburgh',
      date: 'c. 1200',
    });
  });

  it('uses the graph annotation id, not the clause document id', () => {
    expect(clauseToGraphCollectionItem(makeClause())?.id).toBe(99);
  });

  it('returns null when the clause has no connected graph', () => {
    expect(clauseToGraphCollectionItem(makeClause({ annotation_id: null }))).toBeNull();
  });

  it('returns null without coordinates', () => {
    expect(clauseToGraphCollectionItem(makeClause({ annotation_coordinates: null }))).toBeNull();
    expect(clauseToGraphCollectionItem(makeClause({ annotation_coordinates: '  ' }))).toBeNull();
  });

  it('returns null without an IIIF image source', () => {
    expect(clauseToGraphCollectionItem(makeClause({ thumbnail_iiif: null }))).toBeNull();
  });
});
