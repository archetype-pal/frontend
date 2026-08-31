import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { hasTablePreview, ResultsTable } from './results-table';
import type { ClauseListItem } from '@/types/search';

vi.mock('@/contexts/model-labels-context', () => ({
  useModelLabels: () => ({ getLabel: (key: string) => key }),
}));

vi.mock('@/contexts/collection-context', () => ({
  useCollection: () => ({
    isInCollection: () => false,
    addItem: vi.fn(),
    removeItem: vi.fn(),
  }),
}));

vi.mock('@/hooks/use-iiif-thumbnail', () => ({
  useIiifThumbnailUrl: (infoUrl: string, _coords?: string | null, maxSize?: number) =>
    infoUrl ? `https://example.test/crop.jpg?px=${maxSize}` : null,
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

describe('ResultsTable thumbnail row (frontend#74)', () => {
  it('shows the cropped region preview when thumbnails are on', () => {
    render(<ResultsTable resultType="clauses" results={[clause]} />);

    expect(screen.getByRole('img')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Add to collection' })).toBeTruthy();
  });

  it('asks IIIF for a wider crop as the thumbnail size grows', () => {
    // A clause region is a wide strip of a manuscript line: the requested crop
    // width is what decides whether the words are legible, so the t-shirt size
    // has to reach the IIIF request, not just the CSS box.
    const widthFor = (size: 'small' | 'medium' | 'large') => {
      const { unmount } = render(
        <ResultsTable resultType="clauses" results={[clause]} thumbnailSize={size} />
      );
      const src = screen.getByRole('img').getAttribute('src') ?? '';
      unmount();
      return Number(new URL(src, 'https://example.test').searchParams.get('px'));
    };

    expect(widthFor('small')).toBeLessThan(widthFor('medium'));
    expect(widthFor('medium')).toBeLessThan(widthFor('large'));
  });

  it('keeps the clause star when the preview is hidden', () => {
    // The star in this row is the only way to collect a clause from table view,
    // so hiding thumbnails must not take it with them.
    render(<ResultsTable resultType="clauses" results={[clause]} showThumbnails={false} />);

    expect(screen.queryByRole('img')).toBeNull();
    expect(screen.getByRole('button', { name: 'Add to collection' })).toBeTruthy();
  });
});

describe('hasTablePreview', () => {
  it('is true only for the types that render a thumbnail row', () => {
    expect(hasTablePreview('clauses')).toBe(true);
    expect(hasTablePreview('texts')).toBe(true);
    expect(hasTablePreview('people')).toBe(true);
    expect(hasTablePreview('places')).toBe(true);
    // Nothing for the toggle to hide on these, so it should not offer itself.
    expect(hasTablePreview('images')).toBe(false);
    expect(hasTablePreview('graphs')).toBe(false);
    expect(hasTablePreview('manuscripts')).toBe(false);
  });
});
