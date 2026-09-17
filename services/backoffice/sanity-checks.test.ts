import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the underlying authFetch so each test can control the response
// without standing up real fetch infra (mirrors api-client.test.ts).
const authFetchMock = vi.fn();
vi.mock('@/lib/api-fetch', () => ({
  authFetch: (...args: unknown[]) => authFetchMock(...args),
}));

import { BackofficeApiError } from './api-client';
import { getSanityChecks, sendTestEmail } from './sanity-checks';

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

// Captured from a local backend, so a contract drift fails here first.
const FULL_RESPONSE = {
  migrations: { ok: true, has_pending: false, pending: [], detail: null },
  services: {
    database: { ok: true, detail: null },
    redis: { ok: true, detail: null },
    meilisearch: { ok: true, detail: null },
    celery_broker: { ok: true, detail: null },
    celery_workers: { ok: true, workers: 1, detail: null },
  },
  email: { backend: 'django.core.mail.backends.console.EmailBackend', smtp_configured: false },
  database: { size_bytes: 40400575 },
  media: { path: '/app/storage/media', size_bytes: 32196193372, writable: true },
  logs: { configured: false, path: null, writable: null },
};

beforeEach(() => {
  authFetchMock.mockReset();
});

describe('getSanityChecks', () => {
  it('fetches the sanity-checks endpoint and returns the parsed report', async () => {
    authFetchMock.mockResolvedValueOnce(jsonResponse(200, FULL_RESPONSE));
    const result = await getSanityChecks('tok');
    expect(result).toEqual(FULL_RESPONSE);
    const [path, token, init] = authFetchMock.mock.calls[0]!;
    expect(path).toBe('/api/v1/management/common/sanity-checks/');
    expect(token).toBe('tok');
    expect((init as RequestInit)?.cache).toBe('no-store');
  });

  it('accepts a null database size (non-Postgres backend)', async () => {
    authFetchMock.mockResolvedValueOnce(
      jsonResponse(200, { ...FULL_RESPONSE, database: { size_bytes: null } })
    );
    const result = await getSanityChecks('tok');
    expect(result.database.size_bytes).toBeNull();
  });

  it('accepts an unreadable migration graph', async () => {
    const migrations = {
      ok: false,
      has_pending: null,
      pending: [],
      detail: 'Conflicting migrations',
    };
    authFetchMock.mockResolvedValueOnce(jsonResponse(200, { ...FULL_RESPONSE, migrations }));
    const result = await getSanityChecks('tok');
    expect(result.migrations).toEqual(migrations);
  });

  it('accepts pending migrations and a down service with a detail message', async () => {
    authFetchMock.mockResolvedValueOnce(
      jsonResponse(200, {
        ...FULL_RESPONSE,
        migrations: { ok: true, has_pending: true, pending: ['app.0002_x'], detail: null },
        services: {
          ...FULL_RESPONSE.services,
          redis: { ok: false, detail: 'Connection refused' },
        },
      })
    );
    const result = await getSanityChecks('tok');
    expect(result.migrations).toEqual({
      ok: true,
      has_pending: true,
      pending: ['app.0002_x'],
      detail: null,
    });
    expect(result.services.redis).toEqual({ ok: false, detail: 'Connection refused' });
  });

  it('throws BackofficeApiError on a 403 (non-superuser)', async () => {
    authFetchMock.mockResolvedValueOnce(jsonResponse(403, { detail: 'Forbidden' }));
    await expect(getSanityChecks('tok')).rejects.toBeInstanceOf(BackofficeApiError);
  });

  it('rejects the old top-level database_size_bytes shape', async () => {
    const { database: _database, ...rest } = FULL_RESPONSE;
    authFetchMock.mockResolvedValueOnce(
      jsonResponse(200, { ...rest, database_size_bytes: 40400575 })
    );
    await expect(getSanityChecks('tok')).rejects.toThrow();
  });

  it('rejects a malformed response that does not match the contract', async () => {
    authFetchMock.mockResolvedValueOnce(jsonResponse(200, { unexpected: true }));
    await expect(getSanityChecks('tok')).rejects.toThrow();
  });
});

describe('sendTestEmail', () => {
  it('POSTs and returns {sent: true, detail} on success', async () => {
    authFetchMock.mockResolvedValueOnce(
      jsonResponse(200, { sent: true, detail: 'Test email sent to admin@example.com.' })
    );
    const result = await sendTestEmail('tok');
    expect(result).toEqual({ sent: true, detail: 'Test email sent to admin@example.com.' });
    const [path, token, init] = authFetchMock.mock.calls[0]!;
    expect(path).toBe('/api/v1/management/common/sanity-checks/test-email/');
    expect(token).toBe('tok');
    expect((init as RequestInit).method).toBe('POST');
  });

  it('throws BackofficeApiError with the {sent: false, detail} body on a 400 short-circuit', async () => {
    authFetchMock.mockResolvedValueOnce(
      jsonResponse(400, {
        sent: false,
        detail: 'SMTP is not configured (EMAIL_HOST is unset or still the default).',
      })
    );
    await expect(sendTestEmail('tok')).rejects.toMatchObject({
      name: 'BackofficeApiError',
      status: 400,
      body: {
        sent: false,
        detail: 'SMTP is not configured (EMAIL_HOST is unset or still the default).',
      },
    });
  });

  it('throws BackofficeApiError with the {sent: false, detail} body on a 502 delivery failure', async () => {
    authFetchMock.mockResolvedValueOnce(
      jsonResponse(502, { sent: false, detail: 'Connection refused' })
    );
    await expect(sendTestEmail('tok')).rejects.toMatchObject({
      name: 'BackofficeApiError',
      status: 502,
      body: { sent: false, detail: 'Connection refused' },
    });
  });
});
