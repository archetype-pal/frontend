import { describe, expect, it } from 'vitest';

import { charterFolioHref, charterName, charterTextHref } from './charter-route';

const CHARTER = {
  image_text: 599,
  item_image: 7131,
  item_part: 703,
  shelfmark: 'Cotton Ch. xviii.28',
  locus: 'face',
};

describe('charter routes', () => {
  it('opens the folio by its part and image, which is the viewer route', () => {
    expect(charterFolioHref(CHARTER)).toBe('/manuscripts/703/images/7131');
  });

  it('opens the text on the image text tab', () => {
    expect(charterTextHref(CHARTER)).toBe('/manuscripts/703/images/7131/texts/599');
  });
});

describe('charterName', () => {
  it('is the shelfmark and the folio', () => {
    expect(charterName(CHARTER)).toBe('Cotton Ch. xviii.28, face');
  });

  it('is the shelfmark alone when there is no folio', () => {
    expect(charterName({ shelfmark: 'GD55/30', locus: '' })).toBe('GD55/30');
  });

  it('is empty without a shelfmark, so the page can say so', () => {
    expect(charterName({ shelfmark: '', locus: 'face' })).toBe('');
  });
});
