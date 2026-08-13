import { apiFetch, authFetch } from './api-fetch';
import {
  getDefaultModelLabelsConfig,
  normalizeModelLabels,
  type ModelLabelsConfig,
} from './model-labels';

const SITE_LABELS_PATH = '/api/v1/site-labels/';

/**
 * Cache tag shared with the PUT route below: `revalidateTag(SITE_LABELS_TAG)`
 * there invalidates the entry this `next: { tags }` writes here.
 */
export const SITE_LABELS_TAG = 'site-labels';

/**
 * Model labels are backend-owned (`SiteLabel` rows, superuser-editable via
 * the backoffice). Any failure - network error, non-200, or an unexpected
 * response shape - falls back to defaults so SSR never 500s over a backend
 * hiccup (matches `getPublishedPages`'s fallback behavior).
 *
 * This fetch is on the critical path of every page render (the root layout
 * awaits it), so it must not hit the backend on every request: labels only
 * change on an admin PUT, so a short revalidation window (backstop) plus
 * explicit `revalidateTag` on write (immediate) is the right cache shape —
 * see the PUT handler in `app/api/model-labels/route.ts`. Before this, the
 * absence of any `next.revalidate`/`tags` here made that route's
 * `revalidatePath` call a no-op and meant every single page render round-
 * tripped to the backend, which is what let a backend rate-limit hiccup
 * degrade the whole site to hardcoded defaults.
 */
export async function readModelLabels(): Promise<ModelLabelsConfig> {
  const defaults = getDefaultModelLabelsConfig();
  try {
    const res = await apiFetch(SITE_LABELS_PATH, {
      next: { revalidate: 60, tags: [SITE_LABELS_TAG] },
    });
    if (!res.ok) return defaults; // apiFetch already logged the non-2xx above.
    const raw = await res.json();
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      // A 200 with a malformed body isn't an HTTP-layer failure, so apiFetch
      // never sees it — log it here or this degrades to defaults just as
      // silently as the 429 that prompted this whole logging pass.
      console.error(`[API] GET ${SITE_LABELS_PATH} → 200 with unexpected body shape`, raw);
      return defaults;
    }
    const parsed = raw as Partial<ModelLabelsConfig>;
    return { labels: normalizeModelLabels(parsed.labels) };
  } catch {
    return defaults;
  }
}

/** Upserts the given keys via the backend's superuser-only PUT; throws on failure. */
export async function writeModelLabels(config: ModelLabelsConfig, token: string): Promise<void> {
  const res = await authFetch(SITE_LABELS_PATH, token, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ labels: normalizeModelLabels(config.labels) }),
  });
  if (!res.ok) {
    const details = await res.text().catch(() => '');
    throw Object.assign(
      new Error(`Failed to write site labels: ${res.status}${details ? ` - ${details}` : ''}`),
      { status: res.status }
    );
  }
}
