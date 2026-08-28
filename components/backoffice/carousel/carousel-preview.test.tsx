import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CarouselPreview } from './carousel-preview';
import type { CarouselItem } from '@/types/backoffice';

describe('CarouselPreview', () => {
  it('renders embedded HTML in slide title safely without raw markup tags', () => {
    const items: CarouselItem[] = [
      {
        id: 1,
        title: 'Charter of <i>King Edgar</i> &amp; <b>St. Dunstan</b>',
        url: '/manuscripts/1',
        image: 'media/carousel/edgar.jpg',
        weight: 1,
      },
    ];

    const html = renderToStaticMarkup(<CarouselPreview items={items} />);

    // Renders the HTML tags as elements
    expect(html).toContain('<i>King Edgar</i>');
    expect(html).toContain('<b>St. Dunstan</b>');
    // img alt text should have tags stripped
    expect(html).toContain('alt="Charter of King Edgar &amp;amp; St. Dunstan"');
  });

  it('renders empty preview placeholder when items list is empty', () => {
    const html = renderToStaticMarkup(<CarouselPreview items={[]} />);
    expect(html).toContain('border-dashed');
  });
});
