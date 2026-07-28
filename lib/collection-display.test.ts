import { describe, expect, it } from 'vitest';
import { getCollectionDisplayShelfmark, getCollectionManuscriptLabel } from './collection-display';

describe('getCollectionDisplayShelfmark', () => {
  it('prefers the backend-composed display_label when present', () => {
    expect(
      getCollectionDisplayShelfmark({
        display_label: 'DCA DCD Misc. Ch. 559',
        shelfmark: 'DCD Misc. Ch. 559',
        repository_name: 'Durham Cathedral Archives',
      })
    ).toBe('DCA DCD Misc. Ch. 559');
  });

  it('falls back to the shorthand map for items stored before display_label existed', () => {
    expect(
      getCollectionDisplayShelfmark({
        shelfmark: 'GD55/44',
        repository_name: 'National Records of Scotland',
      })
    ).toBe('NRS GD55/44');
  });

  it('returns the bare shelfmark for legacy items from unmapped repositories', () => {
    expect(
      getCollectionDisplayShelfmark({
        shelfmark: 'DCD Misc. Ch. 559',
        repository_name: 'Durham Cathedral Archives',
      })
    ).toBe('DCD Misc. Ch. 559');
  });
});

describe('getCollectionManuscriptLabel', () => {
  it('composes display_label with locus', () => {
    expect(
      getCollectionManuscriptLabel({
        display_label: 'NRS GD55/44',
        shelfmark: 'GD55/44',
        locus: 'face',
      })
    ).toBe('NRS GD55/44: face');
  });
});
