/** @vitest-environment jsdom */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import RepositoriesPage from './page';

vi.mock('@/contexts/auth-context', () => ({ useAuth: () => ({ token: 'tok' }) }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/services/backoffice/manuscripts', () => ({
  getRepositories: async () => [
    {
      id: 1,
      name: 'British Library',
      label: 'BL',
      place: 'London',
      url: null,
      type: null,
      current_item_count: 2,
    },
    {
      id: 2,
      name: 'Empty Library',
      label: 'EL',
      place: 'Paris',
      url: null,
      type: null,
      current_item_count: 0,
    },
  ],
  createRepository: vi.fn(),
  updateRepository: vi.fn(),
  deleteRepository: vi.fn(),
}));

describe('<RepositoriesPage>', () => {
  it('offers delete only for repositories that hold no items', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <RepositoriesPage />
      </QueryClientProvider>
    );

    expect(await screen.findByText('Holds 2 items')).toBeTruthy();
    expect(screen.getAllByRole('button', { name: 'Delete repository' })).toHaveLength(1);
  });
});
