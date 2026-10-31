import { describe, expect, it } from 'vitest';

import { slugify } from '@/lib/slugify';

describe('slugify', () => {
  it('lower-cases and joins words with single hyphens', () => {
    expect(slugify('Models of  Authority')).toBe('models-of-authority');
  });

  it('drops punctuation and trims the hyphens it leaves at the ends', () => {
    expect(slugify("  St Andrew's charters! ")).toBe('st-andrew-s-charters');
  });

  it('returns an empty slug for a title with no usable characters', () => {
    expect(slugify('***')).toBe('');
  });
});
