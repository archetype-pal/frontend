/** @vitest-environment jsdom */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import PublicationsPage from './page';

const { getPublications } = vi.hoisted(() => ({ getPublications: vi.fn() }));

vi.mock('@/contexts/auth-context', () => ({ useAuth: () => ({ isAuthenticated: true }) }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/services/backoffice/publications', () => ({
  getPublications,
  updatePublication: vi.fn(),
  deletePublication: vi.fn(),
}));

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <PublicationsPage />
    </QueryClientProvider>
  );
}

/** Picks an option of a filter bar select: the status filter comes first, then the type. */
function pick(filterIndex: number, option: string) {
  fireEvent.keyDown(screen.getAllByRole('combobox')[filterIndex], { key: 'ArrowDown' });
  fireEvent.click(screen.getByRole('option', { name: option }));
}

describe('<PublicationsPage>', () => {
  beforeEach(() => {
    getPublications.mockReset();
    getPublications.mockResolvedValue({ count: 0, next: null, previous: null, results: [] });
  });

  it('asks the server for the posts matching the status and type filters', async () => {
    renderPage();
    await waitFor(() => expect(getPublications).toHaveBeenCalledWith({ limit: 20, offset: 0 }));

    pick(0, 'Published');
    await waitFor(() =>
      expect(getPublications).toHaveBeenLastCalledWith({
        limit: 20,
        offset: 0,
        status: 'Published',
      })
    );

    pick(1, 'News');
    await waitFor(() =>
      expect(getPublications).toHaveBeenLastCalledWith({
        limit: 20,
        offset: 0,
        status: 'Published',
        is_news: true,
      })
    );
  });
});
