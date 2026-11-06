import { cache } from 'react';
import { apiFetch } from './api-fetch';
import {
  getDefaultConfig,
  parseSiteFeatures,
  SITE_FEATURES_PATH,
  type SiteFeaturesConfig,
} from './site-features';

let lastGood: SiteFeaturesConfig | null = null;

/** The last config this process read, or the hardcoded defaults if it has read none. */
function fallback(): SiteFeaturesConfig {
  return structuredClone(lastGood ?? getDefaultConfig());
}

/**
 * Site features are backend-owned (`AppSettings`, superuser-editable via the
 * backoffice). A failed read serves the last config this process read, or the
 * defaults, so SSR never 500s over a backend hiccup. The last-known-good is
 * per-process and lost on restart: it bounds the window in which a blip
 * re-enables everything an admin turned off, it does not close it.
 *
 * Read fresh for every request, never from Next's data cache, so a save shows
 * on the next page and nothing has to purge a cached copy. Within a request
 * the read is shared: the root layout, a section's gate and its page make one
 * call between them.
 */
export const readSiteFeatures = cache(async (): Promise<SiteFeaturesConfig> => {
  try {
    const res = await apiFetch(SITE_FEATURES_PATH, { cache: 'no-store' });
    if (!res.ok) return fallback(); // apiFetch already logged the non-2xx.
    const raw = await res.json();
    const config = parseSiteFeatures(raw);
    if (!config) {
      // A 200 with a malformed body isn't an HTTP-layer failure, so apiFetch
      // never sees it — log it here or it degrades silently.
      console.error(`[API] GET ${SITE_FEATURES_PATH} → 200 with unexpected body shape`, raw);
      return fallback();
    }
    lastGood = config;
    // Cloned on the way out so a caller mutating its copy can't corrupt the
    // process-wide last-known-good.
    return structuredClone(lastGood);
  } catch {
    return fallback();
  }
});
