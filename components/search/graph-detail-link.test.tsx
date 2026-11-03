/** @vitest-environment jsdom */
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { resolveGraphDetailUrl } from '@/lib/media-url';
import { renderWithQueryClient } from '@/test/render';

import { GraphDetailLink } from './graph-detail-link';

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('@/lib/media-url', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/media-url')>()),
  resolveGraphDetailUrl: vi.fn(),
}));

const resolve = vi.mocked(resolveGraphDetailUrl);
const VIEWER = '/manuscripts/3/images/2?graph=1';

afterEach(() => {
  vi.clearAllMocks();
});

describe('GraphDetailLink', () => {
  it('links straight to the viewer when the graph carries its image and part', () => {
    renderWithQueryClient(
      <GraphDetailLink graph={{ id: 1, item_image: 2, item_part: 3 }}>Graph</GraphDetailLink>
    );

    expect(screen.getByRole('link', { name: 'Graph' }).getAttribute('href')).toBe(VIEWER);
    expect(resolve).not.toHaveBeenCalled();
  });

  it('looks the image up, then links to it', async () => {
    resolve.mockResolvedValueOnce(VIEWER);

    renderWithQueryClient(<GraphDetailLink graph={{ id: 1 }}>Graph</GraphDetailLink>);

    expect((await screen.findByRole('link', { name: 'Graph' })).getAttribute('href')).toBe(VIEWER);
  });

  it('does not keep a failed lookup: a click asks again and opens the viewer', async () => {
    resolve.mockResolvedValueOnce(null).mockResolvedValueOnce(VIEWER);

    renderWithQueryClient(<GraphDetailLink graph={{ id: 1 }}>Graph</GraphDetailLink>);
    const button = screen.getByRole('button', { name: 'Graph' });
    await waitFor(() => expect(resolve).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(button.hasAttribute('disabled')).toBe(false));

    fireEvent.click(button);

    await waitFor(() => expect(push).toHaveBeenCalledWith(VIEWER));
    expect(resolve).toHaveBeenCalledTimes(2);
  });
});
