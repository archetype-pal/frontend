/** @vitest-environment jsdom */
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { ImageTextDetail } from '@/services/image-texts';

const { loadTextsMock, loadTextMock, tokenMock } = vi.hoisted(() => ({
  loadTextsMock: vi.fn(),
  loadTextMock: vi.fn(),
  tokenMock: vi.fn(async (): Promise<string | null> => 'abc'),
}));

vi.mock('@/lib/auth-token-server', () => ({ getServerAuthToken: tokenMock }));
vi.mock('../image-texts', () => ({
  loadImageTexts: loadTextsMock,
  loadImageText: loadTextMock,
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
    loadTextsMock.mockResolvedValue([draft]);

    render(await TextsTabPage({ params: Promise.resolve(params) }));

    expect(loadTextsMock).toHaveBeenCalledWith('56', 'abc');
    expect(screen.getByText('Draft')).toBeTruthy();
    expect(screen.getByText('Willelmus rex')).toBeTruthy();
  });

  it('lists texts as a visitor when nobody is signed in', async () => {
    tokenMock.mockResolvedValueOnce(null);
    loadTextsMock.mockResolvedValue([{ ...draft, status: 'Live' }]);

    render(await TextsTabPage({ params: Promise.resolve(params) }));

    expect(loadTextsMock).toHaveBeenLastCalledWith('56', null);
    expect(screen.getByText('Willelmus rex')).toBeTruthy();
  });

  it("opens a text with the reader's login", async () => {
    loadTextMock.mockResolvedValue(draft);

    render(await ImageTextDetailPage({ params: Promise.resolve(params) }));

    expect(loadTextMock).toHaveBeenCalledWith('59', 'abc');
    expect(screen.getByText('Willelmus rex')).toBeTruthy();
  });

  it('marks a draft on its own page', async () => {
    loadTextMock.mockResolvedValue(draft);

    render(await ImageTextDetailPage({ params: Promise.resolve(params) }));

    expect(screen.getByText('Draft')).toBeTruthy();
  });

  it.each(['Live', 'Reviewed'] as const)('shows no status on a text page in %s', async (status) => {
    loadTextMock.mockResolvedValue({ ...draft, status });

    render(await ImageTextDetailPage({ params: Promise.resolve(params) }));

    expect(screen.getByText('Willelmus rex')).toBeTruthy();
    expect(screen.queryByText(status)).toBeNull();
  });
});
