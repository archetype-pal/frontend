import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { TooltipProvider } from '@/components/ui/tooltip';

import { VersionFooter } from './version-footer';

vi.mock('next-intl', () => ({ useTranslations: () => (k: string) => k }));

function renderFooter(body: unknown, collapsed = false) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => Response.json(body))
  );
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <TooltipProvider>
        <VersionFooter collapsed={collapsed} />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

afterEach(() => vi.unstubAllGlobals());

describe('VersionFooter', () => {
  it('shows the frontend and API releases', async () => {
    renderFooter({
      frontend: { version: '2026.09.12.2205', commit: 'abc1234def' },
      api: { version: '2026.09.11.1000', commit: 'def4567abc' },
    });

    expect(await screen.findByText('2026.09.12.2205')).toBeTruthy();
    expect(screen.getByText('2026.09.11.1000')).toBeTruthy();
    expect(fetch).toHaveBeenCalledWith('/api/version');
  });

  it('says the API release is unavailable when the backend did not answer', async () => {
    renderFooter({ frontend: { version: 'dev', commit: 'unknown' }, api: null });

    expect(await screen.findByText('sidebar.versionUnavailable')).toBeTruthy();
  });

  it('collapses to a labelled icon', async () => {
    renderFooter({ frontend: { version: 'dev', commit: 'unknown' }, api: null }, true);

    expect(await screen.findByLabelText('sidebar.version')).toBeTruthy();
    expect(screen.queryByText('dev')).toBeNull();
  });
});
