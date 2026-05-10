import { readFile, writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { getDefaultConfig, normalizeSectionOrder, type SiteFeaturesConfig } from './site-features';

const CONFIG_PATH = path.join(process.cwd(), 'config', 'site-features.json');

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

export async function readSiteFeatures(): Promise<SiteFeaturesConfig> {
  const defaults = getDefaultConfig();
  try {
    const raw = await readFile(CONFIG_PATH, 'utf-8');
    const rawParsed: unknown = JSON.parse(raw);
    // If the file was hand-edited to `null`, an array, or a primitive, we'd
    // crash on `parsed.sections` reading below. Bail out to defaults so the
    // SSR layout doesn't 500 the whole site over a broken config file.
    if (!isPlainObject(rawParsed)) return defaults;
    const parsed = rawParsed as Partial<SiteFeaturesConfig>;
    // Defensive: spreading a string or array into an object produces
    // index-keyed entries (e.g. {"0": "l", "1": "o"}) and pollutes the
    // runtime config. Treat anything non-plain-object as missing so
    // malformed config rows fall back to defaults instead of leaking
    // garbage keys to consumers.
    const parsedSections = isPlainObject(parsed.sections) ? parsed.sections : {};
    const parsedCategories = isPlainObject(parsed.searchCategories) ? parsed.searchCategories : {};
    return {
      sections: { ...defaults.sections, ...parsedSections },
      sectionOrder: normalizeSectionOrder(parsed.sectionOrder),
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

export async function writeSiteFeatures(config: SiteFeaturesConfig): Promise<SiteFeaturesConfig> {
  const dir = path.dirname(CONFIG_PATH);
  await mkdir(dir, { recursive: true });
  // Construct the normalized config from KNOWN keys only — `...config` would
  // also write any extra keys a malicious or buggy payload included, slowly
  // bloating the on-disk JSON with garbage. readSiteFeatures already
  // ignores unknown keys when loading, so a strict whitelist here keeps
  // both ends symmetric and the file pristine.
  const normalized: SiteFeaturesConfig = {
    sections: config.sections,
    sectionOrder: normalizeSectionOrder(config.sectionOrder),
    searchCategories: config.searchCategories,
  };
  await writeFile(CONFIG_PATH, JSON.stringify(normalized, null, 2), 'utf-8');
  // Return the normalized config so callers (e.g. the PUT route handler)
  // can echo back exactly what was persisted. Returning the input verbatim
  // would let the client's TanStack Query cache diverge from disk on
  // every save — sectionOrder would silently differ until the next refetch.
  return normalized;
}
