import { cache } from 'react';
import { apiFetch } from './api-fetch';
import {
  getDefaultModelLabelsConfig,
  parseModelLabels,
  SITE_LABELS_PATH,
  type ModelLabelsConfig,
} from './model-labels';

/**
 * Model labels are backend-owned (`SiteLabel` rows, superuser-editable via the
 * backoffice). Any failure — network error, non-200, or a 200 carrying no
 * stored labels — falls back to the defaults so SSR never 500s over a backend
 * hiccup.
 *
 * Read fresh for every request, never from Next's data cache, so a save shows
 * on the next page; within a request the read is shared.
 */
export const readModelLabels = cache(async (): Promise<ModelLabelsConfig> => {
  try {
    const res = await apiFetch(SITE_LABELS_PATH, { cache: 'no-store' });
    if (!res.ok) return getDefaultModelLabelsConfig(); // apiFetch already logged the non-2xx.
    const raw = await res.json();
    const config = parseModelLabels(raw);
    if (config) return config;
    // A 200 with no stored labels isn't an HTTP-layer failure, so apiFetch never sees it.
    console.error(`[API] GET ${SITE_LABELS_PATH} → 200 without a usable labels map`, raw);
  } catch {
    // apiFetch has logged the network failure.
  }
  return getDefaultModelLabelsConfig();
});
