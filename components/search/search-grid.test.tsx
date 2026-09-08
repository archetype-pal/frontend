import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SearchGrid } from './search-grid';
import type { ClauseListItem, GraphListItem } from '@/types/search';

const { thumbnailUrlSpy } = vi.hoisted(() => ({ thumbnailUrlSpy: vi.fn() }));

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));

vi.mock('@/contexts/collection-context', () => ({
  useCollection: () => ({
    isInCollection: () => false,
    addItem: vi.fn(),
    removeItem: vi.fn(),
  }),
}));

// Stands in for the real hook so the assertions can see what it was asked for
// without a network round-trip. An empty info URL means "don't fetch".
vi.mock('@/hooks/use-iiif-thumbnail', () => ({
  useIiifThumbnailUrl: (infoUrl: string, coordinates?: string | null) => {
    thumbnailUrlSpy(infoUrl, coordinates);
    return infoUrl ? 'https://example.test/crop.jpg' : null;
  },
}));

const clause: ClauseListItem = {
  id: '1576_1',
  item_image: 1576,
  item_part: 227,
  text_type: 'Charter',
  repository_city: 'London',
  repository_name: 'British Library',
  shelfmark: 'Cotton Ch. xviii.13',
  date: '1160',
  date_min: 1160,
  date_max: 1160,
  catalogue_numbers: '123',
  locus: 'face',
  type: 'Charter',
  status: 'Published',
  thumbnail_iiif: 'https://example.test/iiif/2/image.jp2/info.json',
  annotation_id: 42,
  annotation_coordinates: '{"type":"Feature"}',
  clause_type: 'disposition',
  content: 'Sciant presentes et futuri...',
};

const graph: GraphListItem = {
  id: 7,
  item_image: 1576,
  item_part: 227,
  repository_name: 'British Library',
  repository_city: 'London',
  shelfmark: 'Cotton Ch. xviii.13',
  date: '1160',
  image_iiif: 'https://example.test/iiif/2/image.jp2/info.json',
  coordinates: '{"type":"Feature"}',
  is_annotated: true,
};

describe('SearchGrid text-only mode (frontend#74)', () => {
  beforeEach(() => {
    thumbnailUrlSpy.mockClear();
  });

  it('crops a clause thumbnail to its annotation region when thumbnails are on', () => {
    render(<SearchGrid results={[clause]} resultType="clauses" />);

    expect(screen.getByRole('img')).toBeTruthy();
    expect(thumbnailUrlSpy).toHaveBeenCalledWith(clause.thumbnail_iiif, '{"type":"Feature"}');
  });

  it('renders no image and asks for no IIIF info when thumbnails are off', () => {
    render(<SearchGrid results={[clause]} resultType="clauses" showThumbnails={false} />);

    expect(screen.queryByRole('img')).toBeNull();
    // Hiding thumbnails has to skip the work, not just the markup: a bounded
    // crop costs an info.json fetch per distinct image.
    expect(thumbnailUrlSpy).toHaveBeenCalledWith('', '{"type":"Feature"}');
    expect(thumbnailUrlSpy).not.toHaveBeenCalledWith(clause.thumbnail_iiif, expect.anything());
  });

  it('keeps the collect and lightbox actions on a clause card without a thumbnail', () => {
    render(<SearchGrid results={[clause]} resultType="clauses" showThumbnails={false} />);

    expect(screen.getByRole('button', { name: 'Add to collection' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Open in Lightbox' })).toBeTruthy();
  });

  it('keeps the collect and lightbox actions on a graph card without a thumbnail', () => {
    render(<SearchGrid results={[graph]} resultType="graphs" showThumbnails={false} />);

    expect(screen.queryByRole('img')).toBeNull();
    expect(screen.getByRole('button', { name: 'Add to collection' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Open in Lightbox' })).toBeTruthy();
  });
});
