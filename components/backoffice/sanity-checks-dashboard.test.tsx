/** @vitest-environment jsdom */
import * as React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/contexts/auth-context', () => ({
  useAuth: () => ({ token: 'tok' }),
}));

const getSanityChecksMock = vi.fn();
const sendTestEmailMock = vi.fn();
vi.mock('@/services/backoffice/sanity-checks', () => ({
  getSanityChecks: (...args: unknown[]) => getSanityChecksMock(...args),
  sendTestEmail: (...args: unknown[]) => sendTestEmailMock(...args),
}));

const toastSuccessMock = vi.fn();
const toastErrorMock = vi.fn();
vi.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccessMock(...args),
    error: (...args: unknown[]) => toastErrorMock(...args),
  },
}));

import { BackofficeApiError } from '@/services/backoffice/api-client';

import { SanityChecksDashboard } from './sanity-checks-dashboard';

const REPORT = {
  migrations: { has_pending: false, pending: [] },
  services: {
    database: { ok: true, detail: null },
    redis: { ok: true, detail: null },
    meilisearch: { ok: true, detail: null },
    celery_broker: { ok: true, detail: null },
  },
  email: { smtp_configured: true },
  database_size_bytes: 123456789,
  media: { path: '/srv/app/storage/media', size_bytes: 987654321, writable: true },
  logs: { path: '/srv/app', writable: true },
};

function renderDashboard() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <SanityChecksDashboard />
    </QueryClientProvider>
  );
}

beforeEach(() => {
  getSanityChecksMock.mockReset();
  sendTestEmailMock.mockReset();
  toastSuccessMock.mockReset();
  toastErrorMock.mockReset();
});

describe('SanityChecksDashboard', () => {
  it('shows a loading state before the report resolves', () => {
    getSanityChecksMock.mockReturnValue(new Promise(() => {})); // never resolves
    renderDashboard();
    expect(screen.getByText('System Sanity Checks')).toBeTruthy();
  });

  it('renders an up-to-date migrations badge and all services as OK', async () => {
    getSanityChecksMock.mockResolvedValueOnce(REPORT);
    renderDashboard();

    expect(await screen.findByText('Up to date')).toBeTruthy();
    expect(screen.getByText('Database')).toBeTruthy();
    expect(screen.getByText('Redis')).toBeTruthy();
    expect(screen.getByText('Meilisearch')).toBeTruthy();
    expect(screen.getByText('Celery Broker')).toBeTruthy();
  });

  it('renders pending migrations and a failing service with its detail', async () => {
    getSanityChecksMock.mockResolvedValueOnce({
      ...REPORT,
      migrations: { has_pending: true, pending: ['app.0002_x', 'app.0003_y'] },
      services: {
        ...REPORT.services,
        redis: { ok: false, detail: 'Connection refused' },
      },
    });
    renderDashboard();

    expect(await screen.findByText('2 pending')).toBeTruthy();
    expect(screen.getByText('app.0002_x')).toBeTruthy();
    expect(screen.getByText('app.0003_y')).toBeTruthy();
    expect(screen.getByText('Connection refused')).toBeTruthy();
  });

  it('formats database and media sizes as human-readable byte strings', async () => {
    getSanityChecksMock.mockResolvedValueOnce(REPORT);
    renderDashboard();

    expect(await screen.findByText('117.7 MB')).toBeTruthy();
    expect(screen.getByText('941.9 MB')).toBeTruthy();
  });

  it('shows "Unavailable" for a null database size (non-Postgres backend)', async () => {
    getSanityChecksMock.mockResolvedValueOnce({ ...REPORT, database_size_bytes: null });
    renderDashboard();

    expect(await screen.findByText('Unavailable (non-PostgreSQL backend)')).toBeTruthy();
  });

  it('shows the send-test-email form when SMTP is configured, and sends on submit', async () => {
    getSanityChecksMock.mockResolvedValueOnce(REPORT);
    sendTestEmailMock.mockResolvedValueOnce({ sent: true, detail: 'Test email sent.' });
    renderDashboard();

    const input = await screen.findByPlaceholderText('someone@example.com');
    fireEvent.change(input, { target: { value: 'ops@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: /send test email/i }));

    await waitFor(() => expect(sendTestEmailMock).toHaveBeenCalledWith('tok', 'ops@example.com'));
    await waitFor(() => expect(toastSuccessMock).toHaveBeenCalled());
  });

  it('shows a toast with the backend detail when sending a test email fails', async () => {
    getSanityChecksMock.mockResolvedValueOnce(REPORT);
    sendTestEmailMock.mockRejectedValueOnce(
      new BackofficeApiError(502, { sent: false, detail: 'Connection refused' })
    );
    renderDashboard();

    const input = await screen.findByPlaceholderText('someone@example.com');
    fireEvent.change(input, { target: { value: 'ops@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: /send test email/i }));

    await waitFor(() => expect(toastErrorMock).toHaveBeenCalled());
    expect(toastErrorMock.mock.calls[0]![1]).toMatchObject({ description: 'Connection refused' });
  });

  it('hides the send-test-email form and explains why when SMTP is not configured', async () => {
    getSanityChecksMock.mockResolvedValueOnce({
      ...REPORT,
      email: { smtp_configured: false },
    });
    renderDashboard();

    expect(await screen.findByText('SMTP is not configured')).toBeTruthy();
    expect(screen.getByText('Test email unavailable')).toBeTruthy();
    expect(screen.queryByPlaceholderText('someone@example.com')).toBeNull();
    expect(screen.queryByRole('button', { name: /send test email/i })).toBeNull();
  });

  it('shows an error message when the report fails to load', async () => {
    getSanityChecksMock.mockRejectedValueOnce(new Error('Network error'));
    renderDashboard();

    expect(await screen.findByText('Error: Network error')).toBeTruthy();
  });
});
