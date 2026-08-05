import { apiFetch, authFetch } from './api-fetch';
import {
  getDefaultConfig,
  getDefaultFeatures,
  mergeFeatureFlags,
  normalizeSectionOrder,
  type SiteFeaturesConfig,
} from './site-features';

const SITE_FEATURES_PATH = '/api/v1/site-features/';

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Site features are backend-owned (`AppSettings`, superuser-editable via the
 * backoffice). Any failure - network error, non-200, or an unexpected
 * response shape - falls back to defaults so SSR never 500s over a backend
 * hiccup (matches `readModelLabels`'s fallback behavior).
 */
export async function readSiteFeatures(): Promise<SiteFeaturesConfig> {
  const defaults = getDefaultConfig();
  try {
    const res = await apiFetch(SITE_FEATURES_PATH);
    if (!res.ok) return defaults;
    const raw = await res.json();
    // If the response is `null`, an array, or a primitive, we'd crash on
    // `parsed.sections` reading below. Bail out to defaults so the SSR
    // layout doesn't 500 the whole site over a broken/unexpected response.
    if (!isPlainObject(raw)) return defaults;
    const parsed = raw as Partial<SiteFeaturesConfig>;
    // Defensive: spreading a string or array into an object produces
    // index-keyed entries (e.g. {"0": "l", "1": "o"}) and pollutes the
    // runtime config. Treat anything non-plain-object as missing so
    // malformed responses fall back to defaults instead of leaking garbage
    // keys to consumers.
    const parsedSections = isPlainObject(parsed.sections) ? parsed.sections : {};
    const parsedCategories = isPlainObject(parsed.searchCategories) ? parsed.searchCategories : {};
    return {
      sections: { ...defaults.sections, ...parsedSections },
      sectionOrder: normalizeSectionOrder(parsed.sectionOrder),
      // Every config written before feature flags existed has no `features`
      // key at all, so this merge is the whole backward-compat story:
      // unknown/absent flags fall back to the defaults (enabled) and an
      // already-shipped feature survives the deploy that introduces its
      // flag. `mergeFeatureFlags` applies the same non-plain-object defence
      // used for `sections` above, and additionally drops non-boolean values.
      features: mergeFeatureFlags(defaults.features, parsed.features),
      searchCategories: {
        ...defaults.searchCategories,
        ...Object.fromEntries(
          Object.entries(parsedCategories).map(([k, v]) => [
            k,
            {
              ...defaults.searchCategories[k as keyof typeof defaults.searchCategories],
              ...(isPlainObject(v) ? v : {}),
            },
          ])
        ),
      },
    };
  } catch {
    return defaults;
  }
}

/** Upserts the given config via the backend's superuser-only PUT; throws on failure. */
export async function writeSiteFeatures(
  config: SiteFeaturesConfig,
  token: string
): Promise<SiteFeaturesConfig> {
  // Construct the normalized config from KNOWN keys only — `...config` would
  // also write any extra keys a malicious or buggy payload included, slowly
  // bloating the persisted config with garbage. readSiteFeatures already
  // ignores unknown keys when loading, so a strict whitelist here keeps both
  // ends symmetric and the stored config pristine.
  const normalized: SiteFeaturesConfig = {
    sections: config.sections,
    sectionOrder: normalizeSectionOrder(config.sectionOrder),
    // `features` MUST be listed here: the whitelist is exhaustive, so omitting
    // it would silently drop every flag on each admin save — the stored config
    // would lose the key, the next read would restore the defaults, and a
    // disabled feature would reappear. Merging over the defaults (rather than
    // trusting `config.features` verbatim) also keeps the persisted map
    // complete and boolean-typed even if a caller hands us a partial object.
    features: mergeFeatureFlags(getDefaultFeatures(), config.features),
    searchCategories: config.searchCategories,
  };
  const res = await authFetch(SITE_FEATURES_PATH, token, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(normalized),
  });
  if (!res.ok) {
    throw new Error(`Failed to write site features: ${res.status}`);
  }
  // Return the normalized config so callers (e.g. the PUT route handler) can
  // echo back exactly what was persisted. Returning the input verbatim would
  // let the client's TanStack Query cache diverge from the backend on every
  // save — sectionOrder would silently differ until the next refetch.
  return normalized;
}
