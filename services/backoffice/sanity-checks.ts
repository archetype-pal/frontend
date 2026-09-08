import { z } from 'zod';

import { backofficeGet, backofficePost } from './api-client';

// Response shape confirmed against the backend's actual implementation
// (apps.common.services.sanity_checks.run_sanity_checks and
// apps.common.views.SanityCheckTestEmailView) rather than assumed — the
// field names/nesting here differ from an earlier sketch of the contract
// (e.g. "migrations.pending" not "pending_migrations", "email.smtp_configured"
// not a top-level "smtp_configured", "media.size_bytes"/"media.writable" and
// "logs.writable" not a top-level "permissions" object).

const SERVICE_ENDPOINT = '/api/v1/management/common/sanity-checks/';
const TEST_EMAIL_ENDPOINT = '/api/v1/management/common/sanity-checks/test-email/';

const ServiceCheckSchema = z.object({
  ok: z.boolean(),
  detail: z.string().nullable(),
});

export const SanityChecksSchema = z.object({
  migrations: z.object({
    has_pending: z.boolean(),
    pending: z.array(z.string()),
  }),
  services: z.object({
    database: ServiceCheckSchema,
    redis: ServiceCheckSchema,
    meilisearch: ServiceCheckSchema,
    celery_broker: ServiceCheckSchema,
  }),
  email: z.object({
    smtp_configured: z.boolean(),
  }),
  // Postgres-only: null on other backends (e.g. sqlite in tests/dev).
  database_size_bytes: z.number().nullable(),
  media: z.object({
    path: z.string(),
    size_bytes: z.number(),
    writable: z.boolean(),
  }),
  logs: z.object({
    path: z.string(),
    writable: z.boolean(),
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
