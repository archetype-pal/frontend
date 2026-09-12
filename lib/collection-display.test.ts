import { describe, expect, it } from 'vitest';
import {
  getCollectionDisplayShelfmark,
  getCollectionGridCardLabels,
  getCollectionManuscriptLabel,
} from './collection-display';

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

describe('getCollectionGridCardLabels', () => {
  it('labels image cards with the full manuscript label instead of locus alone', () => {
    expect(
      getCollectionGridCardLabels({
        type: 'image',
        display_label: 'NRS GD55/44',
        shelfmark: 'GD55/44',
        locus: 'face',
      })
    ).toEqual({ title: 'NRS GD55/44: face' });
  });

  it('labels graph cards with manuscript context plus annotation details', () => {
    expect(
      getCollectionGridCardLabels({
        type: 'graph',
        display_label: 'BL Cotton Ch. xviii.13',
        shelfmark: 'Cotton Ch. xviii.13',
        locus: 'face',
        allograph: 'a',
        hand_name: 'Hand 1',
      })
    ).toEqual({
      title: 'BL Cotton Ch. xviii.13: face',
      subtitle: 'a · Hand 1',
    });
  });

  it('keeps editorial annotation cards focused on the manuscript label', () => {
    expect(
      getCollectionGridCardLabels({
        type: 'graph',
        annotation_type: 'editorial',
        display_label: 'DCA DCD Misc. Ch. 971',
        locus: 'face',
        allograph: 'a',
      })
    ).toEqual({ title: 'DCA DCD Misc. Ch. 971: face' });
  });

  it('uses the provided untitled fallback when no label fields are available', () => {
    expect(getCollectionGridCardLabels({ type: 'image' }, 'Sans titre')).toEqual({
      title: 'Sans titre',
    });
  });
});
