/** @vitest-environment jsdom */
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { jsonResponse, textResponse } from '@/test/responses';

const { apiFetch } = vi.hoisted(() => ({ apiFetch: vi.fn() }));

vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND');
  },
  redirect: (url: string) => {
    throw new Error(`NEXT_REDIRECT ${url}`);
  },
}));
vi.mock('@/lib/api-fetch', () => ({ apiFetch }));
vi.mock('./image-header', () => ({
  ImageHeader: () => <header>image header</header>,
  ImageHeaderSkeleton: () => null,
}));

import ManuscriptImageLayout from './layout';

const renderImage = (id: string, imageId: string) =>
  ManuscriptImageLayout({ children: 'viewer', params: Promise.resolve({ id, imageId }) });

beforeEach(() => {
  apiFetch.mockReset();
});

describe('/manuscripts/[id]/images/[imageId]', () => {
  it('404s an image the API does not have', async () => {
    apiFetch.mockResolvedValue(jsonResponse({ detail: 'Not found.' }, 404));
    await expect(renderImage('5', '999999')).rejects.toThrow('NEXT_NOT_FOUND');
  });

  it("redirects a link that carries the image's old part to its current one", async () => {
    apiFetch.mockResolvedValue(jsonResponse({ id: 9, item_part: 7 }));
    await expect(renderImage('5', '9')).rejects.toThrow('NEXT_REDIRECT /manuscripts/7/images/9');
  });

  it('renders the header and the tab for an image on its own part', async () => {
    apiFetch.mockResolvedValue(jsonResponse({ id: 9, item_part: 5 }));
    render(await renderImage('5', '9'));
    expect(screen.getByText('image header')).toBeTruthy();
    expect(screen.getByText('viewer')).toBeTruthy();
  });

  it("sends an API failure to the part's error boundary", async () => {
    apiFetch.mockResolvedValue(textResponse(503, 'Service Unavailable'));
    await expect(renderImage('5', '9')).rejects.toThrow('Failed to fetch manuscript image: 503');
  });
});
