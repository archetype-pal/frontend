import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';

import { TooltipProvider } from '@/components/ui/tooltip';

import { ApiVersion, formatReleaseDate } from './api-version';

const { apiFetch } = vi.hoisted(() => ({ apiFetch: vi.fn() }));
vi.mock('@/lib/api-fetch', () => ({ apiFetch }));
vi.mock('next-intl', () => ({
  useTranslations: () => (k: string) => k,
  useLocale: () => 'en',
}));

function renderVersion() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <TooltipProvider>
        <ApiVersion />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

describe('formatReleaseDate', () => {
  it('reads a release stamp as a UTC build time', () => {
    // Month abbreviations vary between ICU versions, so pin only the stable parts.
    const formatted = formatReleaseDate('2026.09.12.2205', 'en-GB');
    expect(formatted).toMatch(/^12 Sept? 2026, 22:05 UTC$/);
  });

  it('returns null for a build that is not a release', () => {
    expect(formatReleaseDate('dev', 'en')).toBeNull();
  });
});

describe('ApiVersion', () => {
  it('shows the API release', async () => {
    apiFetch.mockResolvedValue(Response.json({ version: '2026.09.12.2205', commit: 'abc1234def' }));

    renderVersion();

    expect(await screen.findByText('2026.09.12.2205')).toBeTruthy();
    expect(screen.getByText('header.apiLabel')).toBeTruthy();
    expect(apiFetch).toHaveBeenCalledWith('/api/v1/version/');
  });

  it('renders nothing when the API does not answer', async () => {
    apiFetch.mockResolvedValue(new Response('', { status: 502 }));

    const { container } = renderVersion();

    await vi.waitFor(() => expect(apiFetch).toHaveBeenCalled());
    expect(container.textContent).toBe('');
  });
});
