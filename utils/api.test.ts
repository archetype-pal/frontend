import { describe, expect, it, vi } from 'vitest';

// Production shape: the browser-facing origin differs from the server-side base.
// That divergence is exactly what the re-hosting below exists to handle.
vi.mock('@/lib/env', () => ({
  env: {
    apiUrl: 'https://archetype.example',
    serverApiUrl: 'http://api',
    iiifUpstream: 'http://sipi:1024',
    siteUrl: 'https://archetype.example',
  },
}));

import { getCarouselImageUrl } from './api';

describe('getCarouselImageUrl', () => {
  it('falls back to the placeholder for empty values', () => {
    expect(getCarouselImageUrl(null)).toBe('/placeholder.svg');
    expect(getCarouselImageUrl(undefined)).toBe('/placeholder.svg');
    expect(getCarouselImageUrl('')).toBe('/placeholder.svg');
  });

  it('prefixes relative paths with the public origin', () => {
    expect(getCarouselImageUrl('media/carousel/a.jpg')).toBe(
      'https://archetype.example/media/carousel/a.jpg'
    );
    expect(getCarouselImageUrl('/media/carousel/a.jpg')).toBe(
      'https://archetype.example/media/carousel/a.jpg'
    );
  });

  it('re-hosts media URLs that carry the container-internal host', () => {
    // The footer is a Server Component, so DRF's build_absolute_uri sees Host: api
    // and serialises the logo as http://api/... — unresolvable from a browser, and
    // plain http on an https page. Passing it through broke every partner logo.
    expect(getCarouselImageUrl('http://api/media/partners/ahrc.png')).toBe(
      'https://archetype.example/media/partners/ahrc.png'
    );
  });

  it('rewrites a media URL already on the public origin to itself', () => {
    expect(getCarouselImageUrl('https://archetype.example/media/carousel/a.jpg')).toBe(
      'https://archetype.example/media/carousel/a.jpg'
    );
  });

  it('preserves the query string when re-hosting', () => {
    expect(getCarouselImageUrl('http://api/media/partners/a.png?v=2')).toBe(
      'https://archetype.example/media/partners/a.png?v=2'
    );
  });

  it('leaves genuinely external images untouched', () => {
    expect(getCarouselImageUrl('https://ahrc.ukri.org/assets/logo.png')).toBe(
      'https://ahrc.ukri.org/assets/logo.png'
    );
  });
});
