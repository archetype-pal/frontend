/** @vitest-environment jsdom */
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { toast } from 'sonner';
import { getDefaultModelLabelsConfig } from '@/lib/model-labels';
import { jsonResponse } from '@/test/responses';
import TranslationsPage from './page';
import { renderWithQueryClient } from '@/test/render';

vi.mock('@/contexts/auth-context', () => import('@/test/mocks/auth-context'));
vi.mock('next/navigation', () => import('@/test/mocks/next-navigation'));
vi.mock('sonner', () => import('@/test/mocks/sonner'));

const LABELS_URL = '/api/proxy/api/v1/site-labels';

const stored = getDefaultModelLabelsConfig();
stored.labels.appManuscripts = { en: 'Corpus', fr: 'Corpus', de: 'Corpus' };

let getStatus: number;
const fetchMock = vi.fn();

beforeEach(() => {
  getStatus = 200;
  fetchMock.mockReset();
  fetchMock.mockImplementation(async (_url: string, init?: RequestInit) =>
    init?.method === 'PUT'
      ? new Response(JSON.stringify(stored), { status: 200 })
      : new Response(JSON.stringify(stored), { status: getStatus })
  );
  vi.stubGlobal('fetch', fetchMock);
});

const renderPage = () => renderWithQueryClient(<TranslationsPage />);

describe('<TranslationsPage>', () => {
  it('shows an error state instead of a form full of defaults when the read fails', async () => {
    getStatus = 500;
    renderPage();

    expect(await screen.findByText('Failed to load labels.')).toBeTruthy();
    expect(screen.queryByLabelText('English')).toBeNull();
  });

  it('saves only the fields the admin actually edited', async () => {
    renderPage();

    const input = (await screen.findAllByLabelText('English'))[0] as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Models of Authority' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    const [url, init] = fetchMock.mock.calls[1];
    expect([url, init.method]).toEqual([LABELS_URL, 'PUT']);
    // A concurrent rename of another key must not be reverted by this save.
    expect(Object.keys(JSON.parse(init.body).labels)).toEqual(['siteTitle']);
  });

  it('refetches rather than caching anything when the save returns no labels', async () => {
    fetchMock.mockImplementation(async (_url: string, init?: RequestInit) =>
      init?.method === 'PUT'
        ? jsonResponse({ labels: {} })
        : new Response(JSON.stringify(stored), { status: 200 })
    );
    renderPage();

    const input = (await screen.findAllByLabelText('English'))[0] as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Models of Authority' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
  });

  it("shows Django's reason when it refuses a save", async () => {
    fetchMock.mockImplementation(async (_url: string, init?: RequestInit) =>
      init?.method === 'PUT'
        ? jsonResponse({ labels: ["Link(s) for key(s) ['homeQuoteLink'] must be a /path."] }, 400)
        : new Response(JSON.stringify(stored), { status: 200 })
    );
    renderPage();

    const input = (await screen.findAllByLabelText('English'))[0] as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Models of Authority' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(vi.mocked(toast.error).mock.calls[0][1]).toEqual({
      description: "labels: Link(s) for key(s) ['homeQuoteLink'] must be a /path.",
    });
  });
});
