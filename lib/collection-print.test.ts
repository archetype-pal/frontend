import { describe, expect, it, vi } from 'vitest';

vi.mock('@/utils/iiif', () => ({
  coordinatesFromGeoJson: vi.fn(() => ({ x: 1, y: 2, w: 30, h: 15 })),
  getIiifImageUrl: vi.fn((url: string) => `${url}/page-print`),
  getIiifImageUrlWithBounds: vi.fn(async (url: string) => {
    if (url.includes('broken')) throw new Error('IIIF unavailable');
    return `${url}/annotation-print`;
  }),
}));

import { buildCollectionPrintHtml } from './collection-print';
import type { NamedCollection } from './collection-storage';

describe('buildCollectionPrintHtml', () => {
  it('builds a captioned print grid for page images and annotation crops', async () => {
    const collection: NamedCollection = {
      id: 'research',
      name: 'Research',
      items: [
        {
          id: 10,
          type: 'image',
          image_iiif: 'https://example.test/page',
          shelfmark: 'NRS GD55/1',
          locus: 'face',
        },
        {
          id: 20,
          type: 'graph',
          image_iiif: 'https://example.test/annotation',
          coordinates: '{"type":"Feature"}',
          annotation_type: 'editorial',
          repository_name: 'National Records',
        },
      ],
    };

    const html = await buildCollectionPrintHtml(collection);

    expect(html).toContain('<h1>Research</h1>');
    expect(html).toContain('Models of Authority collection · 2 items');
    expect(html).toContain('https://example.test/page/page-print');
    expect(html).toContain('https://example.test/annotation/annotation-print');
    expect(html).toContain('Page image · NRS GD55/1 · face');
    expect(html).toContain('Editorial annotation · National Records');
  });

  it('escapes collection metadata and preserves items without an image', async () => {
    const collection: NamedCollection = {
      id: 'notes',
      name: '<Research & notes>',
      items: [
        {
          id: 30,
          type: 'graph',
          shelfmark: '"Shelfmark"',
        },
      ],
    };

    const html = await buildCollectionPrintHtml(collection);

    expect(html).toContain('&lt;Research &amp; notes&gt;');
    expect(html).toContain('&quot;Shelfmark&quot;');
    expect(html).toContain('No image available');
    expect(html).not.toContain('<Research & notes>');
  });

  it('uses placeholders for unsafe URLs and individual IIIF failures', async () => {
    const collection: NamedCollection = {
      id: 'notes',
      name: 'Notes',
      items: [
        { id: 40, type: 'image', image_iiif: 'javascript:alert(1)' },
        { id: 50, type: 'graph', image_iiif: 'https://example.test/broken' },
      ],
    };

    const html = await buildCollectionPrintHtml(collection);

    expect(html).not.toContain('javascript:');
    expect(html.match(/No image available/g)).toHaveLength(2);
  });
});
