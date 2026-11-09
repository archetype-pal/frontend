/** @vitest-environment jsdom */
import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { ImageTextDetail } from '@/services/image-texts';

const { loadTextsMock, loadTextMock, tokenMock, intl } = vi.hoisted(() => ({
  loadTextsMock: vi.fn(),
  loadTextMock: vi.fn(),
  tokenMock: vi.fn(async (): Promise<string | null> => 'abc'),
  intl: { locale: 'en' as 'en' | 'fr' },
}));

vi.mock('next-intl/server', async () => {
  const { createTranslator } = await import('next-intl');
  const catalogues = {
    en: (await import('@/messages/en.json')).default,
    fr: (await import('@/messages/fr.json')).default,
  };
  return {
    getTranslations: async (namespace: string) =>
      createTranslator({
        locale: intl.locale,
        messages: catalogues[intl.locale],
        namespace: namespace as never,
      }),
  };
});

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

afterEach(() => {
  intl.locale = 'en';
});

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

  it("says in the reader's language that an image has no texts", async () => {
    intl.locale = 'fr';
    loadTextsMock.mockResolvedValue([]);

    render(await TextsTabPage({ params: Promise.resolve(params) }));

    expect(screen.getByText("Aucun texte n'a été enregistré pour cette image.")).toBeTruthy();
  });

  it("says in the reader's language that a text is not found", async () => {
    intl.locale = 'fr';
    loadTextMock.mockResolvedValue(null);

    render(await ImageTextDetailPage({ params: Promise.resolve(params) }));

    expect(screen.getByText('Texte introuvable.')).toBeTruthy();
    expect(screen.getByText('Retour aux textes')).toBeTruthy();
  });
});
