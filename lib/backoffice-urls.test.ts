import { describe, expect, it } from 'vitest';

import { backofficeUrlFor, type BackofficeKind } from './backoffice-urls';

describe('backofficeUrlFor', () => {
  it('routes a manuscript (HistoricalItem) id straight to its workspace', () => {
    expect(backofficeUrlFor('manuscript', 42)).toBe('/backoffice/manuscripts/42');
  });

  it('routes an item-part id through the resolver, not the HistoricalItem workspace', () => {
    // ItemPart and HistoricalItem ids are different tables: item part 895 is not
    // historical item 895. archetype-pal/frontend#142
    expect(backofficeUrlFor('item-part', 42)).toBe('/backoffice/item-parts/42');
  });

  it('routes scribe / hand / publication to their own admin sections', () => {
    expect(backofficeUrlFor('scribe', 7)).toBe('/backoffice/scribes/7');
    expect(backofficeUrlFor('hand', 7)).toBe('/backoffice/hands/7');
    expect(backofficeUrlFor('publication', 7)).toBe('/backoffice/publications/7');
  });

  it('accepts string ids verbatim (used for slugs / non-numeric pks)', () => {
    expect(backofficeUrlFor('publication', 'my-post')).toBe('/backoffice/publications/my-post');
  });

  it('handles every documented BackofficeKind exhaustively', () => {
    const kinds: BackofficeKind[] = ['manuscript', 'item-part', 'scribe', 'hand', 'publication'];
    for (const k of kinds) {
      const url = backofficeUrlFor(k, 1);
      expect(url.startsWith('/backoffice/')).toBe(true);
      expect(url.endsWith('/1')).toBe(true);
    }
  });
});
