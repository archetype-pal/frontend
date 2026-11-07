/** @vitest-environment jsdom */
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { ImageTextDetail } from '@/services/image-texts';

const { fetchTextsMock, fetchTextMock } = vi.hoisted(() => ({
  fetchTextsMock: vi.fn(),
  fetchTextMock: vi.fn(),
}));

vi.mock('@/lib/auth-token-server', () => ({ getServerAuthToken: async () => 'abc' }));
vi.mock('@/services/image-texts', () => ({
  fetchImageTextsForImage: fetchTextsMock,
  fetchImageText: fetchTextMock,
}));
vi.mock('@/components/text/staff-edit-link', () => ({ StaffEditLink: () => null }));
vi.mock('@/components/text/image-text-viewer', () => ({
  ImageTextViewer: ({ html }: { html: string }) => <div>{html}</div>,
}));

import TextsTabPage from './page';
import ImageTextDetailPage from './[textId]/page';

const draft: ImageTextDetail = {
  id: 59,
  item_image: 56,
  type: 'Transcription',
  content: 'Willelmus rex',
  status: 'Draft',
  language: 'la',
  created: '',
  modified: '',
};

const params = { id: '1351', imageId: '56', textId: '59' };

describe('image Texts tab', () => {
  it("lists the texts the reader's login may see, drafts labelled", async () => {
    fetchTextsMock.mockResolvedValue([draft]);

    render(await TextsTabPage({ params: Promise.resolve(params) }));

    expect(fetchTextsMock).toHaveBeenCalledWith('56', 'abc');
    expect(screen.getByText('Draft')).toBeTruthy();
    expect(screen.getByText('Willelmus rex')).toBeTruthy();
  });

  it("opens a text with the reader's login", async () => {
    fetchTextMock.mockResolvedValue(draft);

    render(await ImageTextDetailPage({ params: Promise.resolve(params) }));

    expect(fetchTextMock).toHaveBeenCalledWith('59', 'abc');
    expect(screen.getByText('Willelmus rex')).toBeTruthy();
  });
});
