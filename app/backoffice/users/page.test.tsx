/** @vitest-environment jsdom */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TooltipProvider } from '@/components/ui/tooltip';

import UsersPage from './page';

const { proxyFetch } = vi.hoisted(() => ({ proxyFetch: vi.fn() }));

vi.mock('@/contexts/auth-context', () => ({ useAuth: () => ({ token: 'tok' }) }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/lib/api-fetch', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api-fetch')>()),
  proxyFetch,
}));

const USERS = '/api/v1/auth/management/users/';

function user(id: number) {
  return {
    id,
    username: `user${String(id).padStart(3, '0')}`,
    email: `user${id}@example.test`,
    first_name: '',
    last_name: '',
    is_staff: false,
    is_superuser: false,
    is_active: true,
    date_joined: '2026-01-01T00:00:00Z',
    last_login: null,
  };
}

function page(from: number, to: number, next: string | null) {
  const results = Array.from({ length: to - from + 1 }, (_, i) => user(from + i));
  return { ok: true, json: async () => ({ count: 105, next, previous: null, results }) };
}

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <TooltipProvider>
        <UsersPage />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

describe('<UsersPage>', () => {
  beforeEach(() => {
    proxyFetch.mockReset();
    proxyFetch.mockImplementation(async (path: string) =>
      path.includes('offset=100')
        ? page(101, 105, null)
        : page(1, 100, `http://api.test${USERS}?limit=100&offset=100`)
    );
  });

  it('lists the users from every page of the API', async () => {
    renderPage();

    expect(await screen.findByText('1–20 of 105')).toBeTruthy();
    expect(proxyFetch).toHaveBeenCalledTimes(2);
    expect(proxyFetch.mock.calls[1][0]).toContain('offset=100');
  });
});
