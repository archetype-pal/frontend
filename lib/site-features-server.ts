import { readFile, writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { getDefaultConfig, normalizeSectionOrder, type SiteFeaturesConfig } from './site-features';

const CONFIG_PATH = path.join(process.cwd(), 'config', 'site-features.json');

export async function readSiteFeatures(): Promise<SiteFeaturesConfig> {
  const defaults = getDefaultConfig();
  try {
    const raw = await readFile(CONFIG_PATH, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<SiteFeaturesConfig>;
    return {
      sections: { ...defaults.sections, ...parsed.sections },
      sectionOrder: normalizeSectionOrder(parsed.sectionOrder),
      searchCategories: {
        ...defaults.searchCategories,
        ...Object.fromEntries(
          Object.entries(parsed.searchCategories ?? {}).map(([k, v]) => [
            k,
            { ...defaults.searchCategories[k as keyof typeof defaults.searchCategories], ...v },
          ])
        ),
      },
    };
  } catch {
    return defaults;
  }
}

export async function writeSiteFeatures(config: SiteFeaturesConfig): Promise<void> {
  const dir = path.dirname(CONFIG_PATH);
  await mkdir(dir, { recursive: true });
  const normalized: SiteFeaturesConfig = {
    ...config,
    sectionOrder: normalizeSectionOrder(config.sectionOrder),
  };
  await writeFile(CONFIG_PATH, JSON.stringify(normalized, null, 2), 'utf-8');
}
