import { describe, expect, it } from 'vitest';

import { manuscriptToCompareItem } from './manuscript-compare';
import type { ManuscriptListItem } from '@/types/search';

function item(overrides: Partial<ManuscriptListItem> = {}): ManuscriptListItem {
  return {
    id: 5,
    display_label: 'BL Additional Ch. 19795',
    repository_name: 'British Library',
    repository_city: 'London',
    shelfmark: 'Add. Ch. 19795',
    catalogue_numbers: [],
    date: '',
    type: '',
    number_of_images: 2,
    issuer_name: '',
    named_beneficiary: '',
    ...overrides,
  };
}

describe('manuscriptToCompareItem', () => {
  it('maps the search result fields onto a CompareItem', () => {
    expect(manuscriptToCompareItem(item())).toEqual({
      itemPartId: 5,
      displayLabel: 'BL Additional Ch. 19795',
      shelfmark: 'Add. Ch. 19795',
      repositoryLabel: 'British Library',
    });
  });

  it('falls back to the shelfmark when display_label is missing', () => {
    expect(manuscriptToCompareItem(item({ display_label: undefined })).displayLabel).toBe(
      'Add. Ch. 19795'
    );
  });

  it('falls back to a numbered label when neither is set', () => {
    expect(
      manuscriptToCompareItem(item({ display_label: undefined, shelfmark: '' })).displayLabel
    ).toBe('Manuscript #5');
  });
});
