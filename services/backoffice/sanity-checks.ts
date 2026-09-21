import { z } from 'zod';

import { backofficeGet, backofficePost } from './api-client';

// Mirrors apps.common.services.sanity_checks.run_sanity_checks. Keep the two in
// step: a field this schema requires but the backend no longer sends fails the
// whole report, not just the card that shows it.

const SERVICE_ENDPOINT = '/api/v1/management/common/sanity-checks/';
const TEST_EMAIL_ENDPOINT = '/api/v1/management/common/sanity-checks/test-email/';

const ServiceCheckSchema = z.object({
  ok: z.boolean(),
  detail: z.string().nullable(),
});

export const SanityChecksSchema = z.object({
  migrations: z.object({
    ok: z.boolean(),
    // null when the migration graph itself cannot be read; `detail` says why.
    has_pending: z.boolean().nullable(),
    pending: z.array(z.string()),
    detail: z.string().nullable(),
  }),
  services: z.object({
    database: ServiceCheckSchema,
    redis: ServiceCheckSchema,
    meilisearch: ServiceCheckSchema,
    celery_broker: ServiceCheckSchema,
    celery_workers: ServiceCheckSchema.extend({ workers: z.number() }),
  }),
  email: z.object({
    backend: z.string(),
    smtp_configured: z.boolean(),
  }),
  database: z.object({
    // Postgres-only: null on other backends (e.g. sqlite in tests).
    size_bytes: z.number().nullable(),
  }),
  media: z.object({
    path: z.string(),
    size_bytes: z.number(),
    writable: z.boolean(),
  }),
  // The project logs to stdout, so normally there is no log file to check.
  logs: z.object({
    configured: z.boolean(),
    path: z.string().nullable(),
    writable: z.boolean().nullable(),
  }),
});

export type ServiceCheck = z.infer<typeof ServiceCheckSchema>;
export type SanityChecks = z.infer<typeof SanityChecksSchema>;

/**
 * GET the superuser-only operational health snapshot: pending migrations,
 * dependent-service reachability, SMTP configuration, storage usage, and
 * filesystem writability.
 */
export async function getSanityChecks(token: string): Promise<SanityChecks> {
  const data = await backofficeGet<unknown>(SERVICE_ENDPOINT, token, { cache: 'no-store' });
  return SanityChecksSchema.parse(data);
}

const TestEmailResultSchema = z.object({
  sent: z.boolean(),
  detail: z.string(),
});

export type TestEmailResult = z.infer<typeof TestEmailResultSchema>;

/**
 * POST a real test email to ADMIN_EMAILS to verify SMTP delivery end-to-end.
 *
 * The backend returns a non-2xx response — surfaced here as a
 * `BackofficeApiError` (see api-client.ts) — in two cases: a 400 when SMTP
 * isn't configured (short-circuits without attempting delivery), and a 502
 * when delivery itself fails. Both bodies are `{sent: false, detail}`.
 */
export async function sendTestEmail(token: string): Promise<TestEmailResult> {
  const data = await backofficePost<unknown>(TEST_EMAIL_ENDPOINT, token, {});
  return TestEmailResultSchema.parse(data);
}
