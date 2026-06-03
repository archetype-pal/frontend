import { describe, expect, it, vi } from 'vitest';

vi.mock('@/utils/iiif', () => ({
  coordinatesFromGeoJson: vi.fn(() => ({ x: 1, y: 2, w: 30, h: 15 })),
  getIiifImageUrl: vi.fn((url: string) => `${url}/page-print`),
  getIiifImageUrlWithBounds: vi.fn(async (url: string) => {
    if (url.includes('broken')) throw new Error('IIIF unavailable');
    return `${url}/annotation-print`;
  }),
}));

import { getIiifImageUrl, getIiifImageUrlWithBounds } from '@/utils/iiif';
import { buildCollectionPrintHtml } from './collection-print';
import type { NamedCollection } from './collection-storage';

describe('buildCollectionPrintHtml', () => {
  it('builds a compact print table for page images and annotation crops', async () => {
    const collection: NamedCollection = {
      id: 'research',
      name: 'Research',
      items: [
        {
          id: 10,
          type: 'image',
          image_iiif: 'https://example.test/page',
          shelfmark: 'Cotton Ch. xviii.2',
          locus: 'face',
          repository_name: 'British Library',
        },
        {
          id: 20,
          type: 'graph',
          image_iiif: 'https://example.test/annotation',
          coordinates: '{"type":"Feature"}',
          annotation_type: 'image',
          allograph: 'b, Caroline minuscule',
          hand_name: 'Hand A',
          shelfmark: 'Cotton Ch. xviii.2',
          locus: 'face',
          repository_name: 'British Library',
        },
      ],
    };

    const html = await buildCollectionPrintHtml(collection);

    expect(html).toContain('<h1>Research</h1>');
    expect(html).toContain('Models of Authority collection · 2 items');
    expect(html).toContain('https://example.test/page/page-print');
    expect(html).toContain('https://example.test/annotation/annotation-print');
    expect(html).toContain('<table class="print-table">');
    expect(html).toContain('<td class="thumb-cell">');
    expect(html).toContain('<div class="item-title">BL Cotton Ch. xviii.2: face</div>');
    expect(html).toContain(
      '<div class="item-meta">Annotation <span aria-hidden="true">·</span> b, Caroline minuscule <span aria-hidden="true">·</span> Hand A</div>'
    );
    expect(html).toContain('Images <span>1 item</span>');
    expect(html).toContain('Annotations <span>1 item</span>');
    expect(html).toContain('Page image · BL Cotton Ch. xviii.2: face');
    expect(html).toContain(
      'Annotation · BL Cotton Ch. xviii.2: face · b, Caroline minuscule · Hand A'
    );
    expect(html).toContain('Array.from(document.images).map(waitForImage)');

    const annotationCall = vi
      .mocked(getIiifImageUrlWithBounds)
      .mock.calls.find(([url]) => url === 'https://example.test/annotation');
    expect(annotationCall?.[1]).toMatchObject({
      coordinates: { x: 1, y: 2, w: 30, h: 15 },
      thumbnail: true,
      flipY: true,
    });
    expect(annotationCall?.[1]).not.toHaveProperty('maxSize');

    const pageImageCall = vi
      .mocked(getIiifImageUrl)
      .mock.calls.find(([url]) => url === 'https://example.test/page');
    expect(pageImageCall?.[1]).toMatchObject({ thumbnail: true });
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
