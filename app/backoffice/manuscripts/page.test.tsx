/** @vitest-environment jsdom */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ModelLabelsProvider } from '@/contexts/model-labels-context';
import ManuscriptsPage from './page';

const { getHistoricalItems, downloadBlob } = vi.hoisted(() => ({
  getHistoricalItems: vi.fn(),
  downloadBlob: vi.fn(),
}));

vi.mock('@/contexts/auth-context', () => ({ useAuth: () => ({ isAuthenticated: true }) }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('@/services/backoffice/manuscripts', () => ({ getHistoricalItems }));
vi.mock('@/lib/download', () => ({ downloadBlob }));

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <ModelLabelsProvider>
        <ManuscriptsPage />
      </ModelLabelsProvider>
    </QueryClientProvider>
  );
}

describe('<ManuscriptsPage>', () => {
  beforeEach(() => {
    getHistoricalItems.mockReset();
    downloadBlob.mockReset();
    getHistoricalItems.mockResolvedValue({ count: 0, next: null, previous: null, results: [] });
  });

  it('exports every manuscript matching the current search and sort', async () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /^Shelfmark/ }));
    fireEvent.change(screen.getByPlaceholderText(/^Search by shelfmark/), {
      target: { value: 'Durham' },
    });
    await waitFor(() =>
      expect(getHistoricalItems).toHaveBeenLastCalledWith(
        expect.objectContaining({ search: 'Durham' })
      )
    );

    fireEvent.click(screen.getByRole('button', { name: 'Export' }));

    await waitFor(() =>
      expect(downloadBlob).toHaveBeenCalledWith('manuscripts.csv', expect.any(Blob))
    );
    expect(getHistoricalItems).toHaveBeenLastCalledWith({
      limit: 100,
      offset: 0,
      search: 'Durham',
      ordering: 'first_repository_label,first_shelfmark',
    });
  });
});
