import { describe, expect, it } from 'vitest';
import { toGridCard } from './search-grid';
import type { GraphListItem, ImageListItem } from '@/types/search';

const baseImage: ImageListItem = {
  id: 1,
  display_label: 'NRS GD55/44',
  repository_name: 'National Records of Scotland',
  repository_city: 'Edinburgh',
  shelfmark: 'GD55/44',
  date: '1150',
  type: 'Charter',
  text: '',
  image_iiif: '',
  locus: 'face',
  number_of_annotations: 0,
  components: [],
};

const baseGraph: GraphListItem = {
  id: 7,
  display_label: 'BL Cotton Ch. xviii.13',
  repository_name: 'British Library',
  repository_city: 'London',
  shelfmark: 'Cotton Ch. xviii.13',
  date: '1160',
  image_iiif: '',
  coordinates: '',
  is_annotated: true,
};

function withFormatted<T>(item: T, formatted: Record<string, string>): T {
  return { ...item, _formatted: formatted };
}

describe('image grid card labels (frontend#69)', () => {
  it('labels cards with repository abbreviation + shelfmark, then locus', () => {
    const card = toGridCard('images', baseImage);
    expect(card?.displayText).toBe('NRS GD55/44, face');
  });

  it('falls back to bare shelfmark for hits indexed without display_label', () => {
    const card = toGridCard('images', { ...baseImage, display_label: undefined });
    expect(card?.displayText).toBe('GD55/44, face');
  });

  it('drops empty segments and falls back to Untitled when nothing is left', () => {
    const noLocus = toGridCard('images', { ...baseImage, locus: '' });
    expect(noLocus?.displayText).toBe('NRS GD55/44');

    const empty = toGridCard('images', {
      ...baseImage,
      display_label: undefined,
      shelfmark: '',
      locus: '',
    });
    expect(empty?.displayText).toBe('Untitled');
  });

  it('composes the Meilisearch highlight variant across segments', () => {
    const card = toGridCard(
      'images',
      withFormatted(baseImage, {
        display_label: 'NRS __hl_start__GD55__hl_end__/44',
        locus: 'face',
      })
    );
    expect(card?.formattedDisplayText).toBe('NRS __hl_start__GD55__hl_end__/44, face');
  });
});

describe('graph grid card labels (frontend#69)', () => {
  it('labels cards with the display_label composite (repo abbreviation included)', () => {
    const card = toGridCard('graphs', baseGraph);
    expect(card?.displayText).toBe('BL Cotton Ch. xviii.13');
  });

  it('falls back to bare shelfmark for hits indexed without display_label', () => {
    const card = toGridCard('graphs', { ...baseGraph, display_label: undefined });
    expect(card?.displayText).toBe('Cotton Ch. xviii.13');
  });

  it('passes the display_label highlight variant through', () => {
    const card = toGridCard(
      'graphs',
      withFormatted(baseGraph, {
        display_label: '__hl_start__BL__hl_end__ Cotton Ch. xviii.13',
        shelfmark: 'Cotton Ch. xviii.13',
      })
    );
    expect(card?.formattedDisplayText).toBe('__hl_start__BL__hl_end__ Cotton Ch. xviii.13');
  });
});
