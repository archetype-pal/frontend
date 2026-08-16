import { apiFetch, authFetch } from './api-fetch';
import {
  getDefaultModelLabelsConfig,
  normalizeModelLabels,
  type LocalizedLabel,
  type ModelLabelKey,
  type ModelLabelsConfig,
} from './model-labels';

const SITE_LABELS_PATH = '/api/v1/site-labels/';

/**
 * Cache tag shared with the PUT route below: `revalidateTag(SITE_LABELS_TAG)`
 * there invalidates the entry this `next: { tags }` writes here.
 */
export const SITE_LABELS_TAG = 'site-labels';

/**
 * Model labels are backend-owned (`SiteLabel` rows, superuser-editable via the
 * backoffice); they previously lived in a container-local JSON file that
 * survived neither a restart nor a second replica. Any failure — network
 * error, non-200, or an unexpected response shape — falls back to defaults so
 * SSR never 500s over a backend hiccup, flagged `degraded` so the GET route can
 * refuse to serve them as if they were the stored labels.
 *
 * The root layout awaits this on every render, hence the revalidation window
 * (backstop) plus `revalidateTag` on write (immediate) — see the PUT handler in
 * `app/api/model-labels/route.ts`.
 */
export async function readModelLabels(): Promise<ModelLabelsConfig & { degraded?: boolean }> {
  const defaults = getDefaultModelLabelsConfig();
  try {
    const res = await apiFetch(SITE_LABELS_PATH, {
      next: { revalidate: 60, tags: [SITE_LABELS_TAG] },
    });
    if (!res.ok) return { ...defaults, degraded: true }; // apiFetch already logged the non-2xx.
    const raw = await res.json();
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      // A 200 with a malformed body isn't an HTTP-layer failure, so apiFetch never sees it.
      console.error(`[API] GET ${SITE_LABELS_PATH} → 200 with unexpected body shape`, raw);
      return { ...defaults, degraded: true };
    }
    const parsed = raw as Partial<ModelLabelsConfig>;
    return { labels: normalizeModelLabels(parsed.labels) };
  } catch {
    return { ...defaults, degraded: true };
  }
}

/**
 * Upserts only the given keys via the backend's superuser-only PUT; throws on
 * failure. Returns the backend's post-write re-read, not the payload.
 */
export async function writeModelLabels(
  labels: Partial<Record<ModelLabelKey, LocalizedLabel>>,
  token: string
): Promise<ModelLabelsConfig> {
  const res = await authFetch(SITE_LABELS_PATH, token, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ labels }),
  });
  if (!res.ok) {
    const details = await res.text().catch(() => '');
    throw Object.assign(
      new Error(`Failed to write site labels: ${res.status}${details ? ` - ${details}` : ''}`),
      { status: res.status }
    );
  }
  const raw = (await res.json()) as Partial<ModelLabelsConfig>;
  return { labels: normalizeModelLabels(raw?.labels) };
}
