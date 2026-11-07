import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ResultsTable } from './results-table';
import { renderWithQueryClient } from '@/test/render';
import type { GraphListItem } from '@/types/search';

vi.mock('@/contexts/model-labels-context', () => import('@/test/mocks/model-labels-context'));

vi.mock('@/contexts/collection-context', () => ({
  useCollection: () => ({
    isInCollection: () => false,
    addItem: vi.fn(),
    removeItem: vi.fn(),
  }),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('@/hooks/use-iiif-thumbnail', () => ({
  useIiifThumbnail: () => ({ src: null, failed: false }),
  useIiifThumbnailUrl: () => 'https://iiif.example/crop.jpg',
}));

const graph = (has_glyph_vector: boolean) =>
  ({
    id: 7,
    image_iiif: 'https://iiif.example/info.json',
    coordinates: '{}',
    shelfmark: 'Cotton Ch. xviii.13',
    has_glyph_vector,
  }) as unknown as GraphListItem;

describe('ResultsTable: letters like this', () => {
  it('links a glyph with a vector to the letters like it', () => {
    renderWithQueryClient(<ResultsTable resultType="graphs" results={[graph(true)]} />);

    expect(screen.getByRole('link', { name: 'Letters like this' }).getAttribute('href')).toBe(
      '/search/graphs/7/similar'
    );
  });

  it('offers nothing for a glyph with no vector', () => {
    renderWithQueryClient(<ResultsTable resultType="graphs" results={[graph(false)]} />);

    expect(screen.queryByRole('link', { name: 'Letters like this' })).toBeNull();
  });
});
