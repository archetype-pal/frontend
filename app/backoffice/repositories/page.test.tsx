/** @vitest-environment jsdom */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { TooltipProvider } from '@/components/ui/tooltip';

import RepositoriesPage from './page';

vi.mock('@/contexts/auth-context', () => ({ useAuth: () => ({ isAuthenticated: true }) }));
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
  it('disables delete, with the reason, on repositories that have linked items', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <TooltipProvider>
          <RepositoriesPage />
        </TooltipProvider>
      </QueryClientProvider>
    );

    const blocked = await screen.findByRole('button', {
      name: "Can't delete: this repository has 2 linked items. Move or delete them first.",
    });
    expect((blocked as HTMLButtonElement).disabled).toBe(true);
    const allowed = screen.getByRole('button', { name: 'Delete repository' });
    expect((allowed as HTMLButtonElement).disabled).toBe(false);
  });
});
