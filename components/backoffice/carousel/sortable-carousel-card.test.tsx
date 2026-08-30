import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { SortableCarouselCard } from './sortable-carousel-card';
import type { CarouselItem } from '@/types/backoffice';

// Mock dnd-kit hooks for static rendering
vi.mock('@dnd-kit/sortable', () => ({
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    transition: undefined,
    isDragging: false,
  }),
}));

describe('SortableCarouselCard', () => {
  it('renders embedded HTML in title safely and strips tags in alt', () => {
    const item: CarouselItem = {
      id: 42,
      title: 'Manuscript with <i>Insular</i> script',
      url: '/manuscripts/42',
      image: 'media/carousel/ms42.jpg',
      ordering: 0,
    };

    const html = renderToStaticMarkup(
      <SortableCarouselCard item={item} isSelected={false} onSelect={vi.fn()} onDelete={vi.fn()} />
    );

    expect(html).toContain('<i>Insular</i>');
    expect(html).toContain('alt="Manuscript with Insular script"');
  });
});
