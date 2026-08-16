/** @vitest-environment jsdom */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getDefaultConfig } from '@/lib/site-features';
import SiteFeaturesPage from './page';

vi.mock('@/contexts/auth-context', () => ({ useAuth: () => ({ token: 'tok' }) }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/contexts/model-labels-context', () => ({
  useModelLabels: () => ({ getLabel: (key: string) => key }),
}));

let getStatus: number;

beforeEach(() => {
  getStatus = 200;
  vi.stubGlobal('fetch', async () =>
    getStatus === 200
      ? new Response(JSON.stringify(getDefaultConfig()), { status: 200 })
      : new Response(JSON.stringify({ error: 'unavailable' }), { status: getStatus })
  );
});

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <SiteFeaturesPage />
    </QueryClientProvider>
  );
}

describe('<SiteFeaturesPage>', () => {
  it('shows an error state instead of an editable form full of defaults', async () => {
    getStatus = 503;
    renderPage();

    expect(await screen.findByText('Failed to load site features')).toBeTruthy();
    expect(screen.queryByText('Site Sections')).toBeNull();
  });

  it('renders the form when the read succeeds', async () => {
    renderPage();
    expect(await screen.findByText('Site Sections')).toBeTruthy();
  });
});
