import { describe, expect, it } from 'vitest';

import { isGlyphAnnotation, isTextRegionAnnotation } from './manuscript-viewer-annotation-types';

const annotation = (annotationType?: string) =>
  ({
    id: 'db:1',
    target: {},
    _meta: { annotationType },
  }) as never;

describe('viewer annotation type boundaries', () => {
  it('identifies text-region annotations', () => {
    expect(isTextRegionAnnotation(annotation('text'))).toBe(true);
    expect(isTextRegionAnnotation(annotation('image'))).toBe(false);
    expect(isTextRegionAnnotation(null)).toBe(false);
  });

  it('keeps image, public-draft, and legacy graphs in glyph workflows only', () => {
    expect(isGlyphAnnotation(annotation('image'))).toBe(true);
    expect(isGlyphAnnotation(annotation('public'))).toBe(true);
    expect(isGlyphAnnotation(annotation())).toBe(true);
    expect(isGlyphAnnotation(annotation('text'))).toBe(false);
    expect(isGlyphAnnotation(annotation('editorial'))).toBe(false);
    expect(isGlyphAnnotation(null)).toBe(false);
  });
});
