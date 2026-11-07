/** @vitest-environment jsdom */
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SimilarGlyphs } from './similar-glyphs';
import { renderWithQueryClient } from '@/test/render';
import type { GraphListItem } from '@/types/search';

const services = vi.hoisted(() => ({ getGlyph: vi.fn(), getSimilarGlyphs: vi.fn() }));
vi.mock('@/services/glyph-search', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/services/glyph-search')>()),
  ...services,
}));
vi.mock('next/navigation', () => import('@/test/mocks/next-navigation'));
vi.mock('@/contexts/collection-context', () => ({
  useCollection: () => ({ isInCollection: () => false, addItem: vi.fn(), removeItem: vi.fn() }),
}));
vi.mock('@/hooks/use-iiif-thumbnail', () => ({ useIiifThumbnailUrl: () => null }));

import { SimilarGlyphsError } from '@/services/glyph-search';

const glyph = (id: number, extra: Partial<GraphListItem> = {}): GraphListItem => ({
  id,
  item_image: 1,
  item_part: 2,
  repository_name: 'National Records of Scotland',
  repository_city: 'Edinburgh',
  shelfmark: 'GD55/296',
  display_label: 'NRS GD55/296',
  date: '1170',
  image_iiif: 'https://example.test/iiif/info.json',
  coordinates: '{"type":"Feature"}',
  is_annotated: true,
  allograph: 'A',
  character: 'A',
  has_glyph_vector: true,
  ...extra,
});

const page = (count: number, total: number, offset = 0) => ({
  results: Array.from({ length: count }, (_, i) =>
    glyph(1000 + offset + i, {
      shelfmark: `GD55/${i}`,
      display_label: `NRS GD55/${i}`,
      _rankingScore: 0.9,
    })
  ),
  total,
  limit: 24,
  offset,
});

beforeEach(() => {
  services.getGlyph.mockReset();
  services.getSimilarGlyphs.mockReset();
});

describe('SimilarGlyphs', () => {
  it('shows the glyph searched from and its nearest glyphs in other charters', async () => {
    services.getGlyph.mockResolvedValue(glyph(95));
    services.getSimilarGlyphs.mockResolvedValue(page(2, 2));

    renderWithQueryClient(<SimilarGlyphs graphId={95} />);

    expect(await screen.findByText('NRS GD55/0')).toBeTruthy();
    expect(screen.getByText('NRS GD55/296')).toBeTruthy();
    expect(screen.getByText('1–2 of 2')).toBeTruthy();
    expect(services.getSimilarGlyphs).toHaveBeenCalledWith(95, {
      excludeShelfmark: 'GD55/296',
      character: null,
      offset: 0,
    });
  });

  it('narrows to the letter, widens to every charter, and pages from the start again', async () => {
    services.getGlyph.mockResolvedValue(glyph(95));
    services.getSimilarGlyphs.mockImplementation(async (_id: number, options: { offset: number }) =>
      page(24, 60, options.offset)
    );
    renderWithQueryClient(<SimilarGlyphs graphId={95} />);
    await screen.findByText('1–24 of 60');

    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    await screen.findByText('25–48 of 60');
    fireEvent.click(screen.getByRole('checkbox', { name: 'Only the letter A' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Only other charters' }));

    await waitFor(() =>
      expect(services.getSimilarGlyphs).toHaveBeenLastCalledWith(95, {
        excludeShelfmark: null,
        character: 'A',
        offset: 0,
      })
    );
    expect(services.getSimilarGlyphs).toHaveBeenCalledWith(95, {
      excludeShelfmark: 'GD55/296',
      character: null,
      offset: 24,
    });
  });

  it('says a glyph without a vector cannot be searched from, and does not ask', async () => {
    services.getGlyph.mockResolvedValue(glyph(88, { has_glyph_vector: false }));

    renderWithQueryClient(<SimilarGlyphs graphId={88} />);

    expect(
      await screen.findByText('This glyph cannot be searched from yet: it has no vector.')
    ).toBeTruthy();
    expect(services.getSimilarGlyphs).not.toHaveBeenCalled();
  });

  it('says when the site has not set the search up', async () => {
    services.getGlyph.mockResolvedValue(glyph(95));
    services.getSimilarGlyphs.mockRejectedValue(new SimilarGlyphsError('unavailable'));

    renderWithQueryClient(<SimilarGlyphs graphId={95} />);

    expect(
      await screen.findByText('Searching by likeness is not set up on this site yet.')
    ).toBeTruthy();
  });
});
