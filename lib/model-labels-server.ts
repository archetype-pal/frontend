import { apiFetch, authFetch } from './api-fetch';
import {
  getDefaultModelLabelsConfig,
  normalizeModelLabels,
  type ModelLabelsConfig,
} from './model-labels';

const SITE_LABELS_PATH = '/api/v1/site-labels/';

/**
 * Model labels are backend-owned (`SiteLabel` rows, superuser-editable via
 * the backoffice). Any failure - network error, non-200, or an unexpected
 * response shape - falls back to defaults so SSR never 500s over a backend
 * hiccup (matches `getPublishedPages`'s fallback behavior).
 */
export async function readModelLabels(): Promise<ModelLabelsConfig> {
  const defaults = getDefaultModelLabelsConfig();
  try {
    const res = await apiFetch(SITE_LABELS_PATH);
    if (!res.ok) return defaults;
    const raw = await res.json();
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return defaults;
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
