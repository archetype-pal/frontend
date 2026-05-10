import { describe, expect, it } from 'vitest';

import { backofficeUrlFor, type BackofficeKind } from './backoffice-urls';

describe('backofficeUrlFor', () => {
  it('routes manuscript and item-part to the same URL pattern', () => {
    // ItemPart and Manuscript are the same row in the backoffice — the
    // alias is intentional. Lock both branches in.
    expect(backofficeUrlFor('manuscript', 42)).toBe('/backoffice/manuscripts/42');
    expect(backofficeUrlFor('item-part', 42)).toBe('/backoffice/manuscripts/42');
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
