import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ProposalCropView } from './proposal-crop-view';

const { fetchIiifImageInfo } = vi.hoisted(() => ({ fetchIiifImageInfo: vi.fn() }));

vi.mock('@/utils/iiif', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/utils/iiif')>()),
  fetchIiifImageInfo,
}));

const INFO = 'http://iiif.test/iiif/2/page.jp2/info.json';
// A 40×40 box, lower edge 200px above the foot of a 1000×2000 page.
const BOX = {
  type: 'Feature',
  geometry: {
    type: 'Polygon',
    coordinates: [
      [
        [500, 200],
        [540, 200],
        [540, 240],
        [500, 240],
        [500, 200],
      ],
    ],
  },
};

describe('<ProposalCropView>', () => {
  beforeEach(() => {
    fetchIiifImageInfo.mockReset();
  });

  it('requests the page around the box and outlines the box on it', async () => {
    fetchIiifImageInfo.mockResolvedValue({ width: 1000, height: 2000 });

    render(<ProposalCropView infoUrl={INFO} annotation={BOX} label="Proposed a" />);

    const image = await screen.findByRole('img', { name: 'Proposed a' });
    expect(image.getAttribute('src')).toContain('/470,1730,100,100/');
    const box = screen.getByTestId('proposal-box');
    expect(box.style.left).toBe('30%');
    expect(box.style.top).toBe('30%');
    expect(box.style.width).toBe('40%');
  });

  it('shows a placeholder when the page cannot be measured, rather than a mis-cropped box', async () => {
    fetchIiifImageInfo.mockResolvedValue(null);

    render(<ProposalCropView infoUrl={INFO} annotation={BOX} label="Proposed a" />);

    expect(await screen.findByText('Proposed a')).not.toBeNull();
    expect(screen.queryByRole('img')).toBeNull();
    expect(screen.queryByTestId('proposal-box')).toBeNull();
  });

  it('shows a placeholder for a page the image server cannot address', () => {
    render(<ProposalCropView infoUrl={null} annotation={BOX} label="Proposed a" />);

    expect(screen.getByText('Proposed a')).not.toBeNull();
    expect(fetchIiifImageInfo).not.toHaveBeenCalled();
  });
});
