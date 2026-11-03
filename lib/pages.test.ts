import { describe, expect, it } from 'vitest';

import { isListedUnderAbout, listedHeading, pageHref } from '@/lib/pages';

const headings = [{ slug: 'research' }, { slug: 'teaching' }];

describe('listedHeading', () => {
  it("is the page's own heading while that heading exists", () => {
    expect(listedHeading('research', headings)).toBe('research');
  });

  it('falls back to About (null) for no heading or a deleted one', () => {
    expect(listedHeading(null, headings)).toBeNull();
    expect(listedHeading('', headings)).toBeNull();
    expect(listedHeading('archived', headings)).toBeNull();
  });

  it('agrees with isListedUnderAbout', () => {
    for (const menuHeading of [null, '', 'research', 'archived']) {
      expect(isListedUnderAbout(menuHeading, headings)).toBe(
        listedHeading(menuHeading, headings) === null
      );
    }
  });
});

describe('pageHref', () => {
  it('puts every page under /about/, whatever its heading', () => {
    expect(pageHref('accessibility')).toBe('/about/accessibility');
  });
});
