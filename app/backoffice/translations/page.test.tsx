/** @vitest-environment jsdom */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getDefaultModelLabelsConfig } from '@/lib/model-labels';
import TranslationsPage from './page';

vi.mock('@/contexts/auth-context', () => ({ useAuth: () => ({ token: 'tok' }) }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const stored = getDefaultModelLabelsConfig();
stored.labels.appManuscripts = { en: 'Corpus', fr: 'Corpus' };

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

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <TranslationsPage />
    </QueryClientProvider>
  );
}

describe('<TranslationsPage>', () => {
  it('shows an error state instead of a form full of defaults when the read fails', async () => {
    getStatus = 503;
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
    const body = JSON.parse(fetchMock.mock.calls[1][1].body);
    // A concurrent rename of another key must not be reverted by this save.
    expect(Object.keys(body.labels)).toEqual(['siteTitle']);
  });

  it('refetches rather than caching anything when the save returns no labels', async () => {
    fetchMock.mockImplementation(async (_url: string, init?: RequestInit) =>
      init?.method === 'PUT'
        ? new Response(null, { status: 204 })
        : new Response(JSON.stringify(stored), { status: 200 })
    );
    renderPage();

    const input = (await screen.findAllByLabelText('English'))[0] as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Models of Authority' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
  });
});
