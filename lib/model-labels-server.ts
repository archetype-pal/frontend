import { apiFetch, authFetch } from './api-fetch';
import {
  getDefaultModelLabelsConfig,
  normalizeModelLabels,
  type ModelLabelsConfig,
} from './model-labels';

const SITE_LABELS_PATH = '/api/v1/site-labels/';

/**
 * Reads label overrides from the backend's `SiteLabels` singleton row. Any
 * failure — network error, non-200, or an unexpected response shape — falls
 * back to defaults so SSR never 500s over a backend hiccup (matches the old
 * file-based behavior of `readJsonConfig`).
 */
export async function readModelLabels(): Promise<ModelLabelsConfig> {
  const defaults = getDefaultModelLabelsConfig();
  try {
    const res = await apiFetch(SITE_LABELS_PATH);
    if (!res.ok) return defaults;
    const raw = await res.json();
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return defaults;
    const parsed = raw as { labels?: unknown };
    return { labels: normalizeModelLabels(parsed.labels as Partial<Record<string, unknown>>) };
  } catch {
    return defaults;
  }
}

export async function writeModelLabels(
  config: ModelLabelsConfig,
  token: string
): Promise<ModelLabelsConfig> {
  const res = await authFetch(SITE_LABELS_PATH, token, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ labels: normalizeModelLabels(config.labels) }),
  });
  if (!res.ok) {
    throw new Error(`Failed to write model labels: ${res.status}`);
  }
  const raw = await res.json();
  return { labels: normalizeModelLabels((raw as { labels?: unknown }).labels as Partial<Record<string, unknown>>) };
}
