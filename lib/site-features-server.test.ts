import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getDefaultConfig } from './site-features';
import { readSiteFeatures, writeSiteFeatures } from './site-features-server';

// `json-config-file` resolves `config/<name>.json` under `process.cwd()` at
// call time, so pointing cwd at a scratch dir exercises the real read/write
// path (real JSON on a real disk) without touching the repo's runtime
// config/site-features.json.
let workDir: string;

async function writeRawConfig(contents: unknown): Promise<void> {
  await mkdir(join(workDir, 'config'), { recursive: true });
  await writeFile(
    join(workDir, 'config', 'site-features.json'),
    JSON.stringify(contents, null, 2),
    'utf-8'
  );
}

async function readRawConfig(): Promise<Record<string, unknown>> {
  return JSON.parse(
    await readFile(join(workDir, 'config', 'site-features.json'), 'utf-8')
  ) as Record<string, unknown>;
}

/** The on-disk shape as it exists today: no `features` key at all. */
function legacyFileContents() {
  const { sections, sectionOrder, searchCategories } = getDefaultConfig();
  return { sections, sectionOrder, searchCategories };
}

beforeEach(async () => {
  workDir = await mkdtemp(join(tmpdir(), 'site-features-'));
  vi.spyOn(process, 'cwd').mockReturnValue(workDir);
});

afterEach(async () => {
  vi.restoreAllMocks();
  await rm(workDir, { recursive: true, force: true });
});

describe('readSiteFeatures — feature flags', () => {
  it('defaults every flag to enabled when there is no config file at all', async () => {
    const config = await readSiteFeatures();
    expect(config.features.manuscriptDescriptions).toBe(true);
  });

  it('keeps a shipped feature enabled for a config file written before flags existed', async () => {
    // This is the deploy case: the persisted file has sections + sectionOrder +
    // searchCategories and nothing else. The feature must not vanish.
    await writeRawConfig(legacyFileContents());
    const config = await readSiteFeatures();
    expect(config.features.manuscriptDescriptions).toBe(true);
  });

  it('honours a persisted disabled flag', async () => {
    await writeRawConfig({ ...legacyFileContents(), features: { manuscriptDescriptions: false } });
    expect((await readSiteFeatures()).features.manuscriptDescriptions).toBe(false);
  });

  it('falls back to defaults when `features` is not a plain object', async () => {
    for (const junk of ['manuscriptDescriptions', ['manuscriptDescriptions'], 7, null]) {
      await writeRawConfig({ ...legacyFileContents(), features: junk });
      const config = await readSiteFeatures();
      expect(config.features).toEqual(getDefaultConfig().features);
    }
  });

  it('ignores unknown flag keys and non-boolean values', async () => {
    await writeRawConfig({
      ...legacyFileContents(),
      features: { manuscriptDescriptions: 'false', bogusFlag: true },
    });
    const config = await readSiteFeatures();
    expect(config.features).toEqual({ manuscriptDescriptions: true });
  });
});

describe('writeSiteFeatures → readSiteFeatures round trip', () => {
  it('preserves a disabled flag (the strict-whitelist trap)', async () => {
    // If `features` were left out of writeSiteFeatures' whitelist, this save
    // would drop the key, the read would restore the default, and the admin's
    // "off" would silently become "on" again on every save.
    const config = getDefaultConfig();
    config.features.manuscriptDescriptions = false;

    const normalized = await writeSiteFeatures(config);
    expect(normalized.features.manuscriptDescriptions).toBe(false);

    const persisted = await readRawConfig();
    expect(persisted.features).toEqual({ manuscriptDescriptions: false });

    expect((await readSiteFeatures()).features.manuscriptDescriptions).toBe(false);
  });

  it('re-enabling a flag survives the round trip too (a flag never deletes data)', async () => {
    const off = getDefaultConfig();
    off.features.manuscriptDescriptions = false;
    await writeSiteFeatures(off);

    const on = getDefaultConfig();
    await writeSiteFeatures(on);
    expect((await readSiteFeatures()).features.manuscriptDescriptions).toBe(true);
  });

  it('persists a complete boolean map even if the caller hands over a partial one', async () => {
    const config = getDefaultConfig();
    // @ts-expect-error — a hand-rolled/older payload without the flag map
    delete config.features;

    await writeSiteFeatures(config);
    expect(await readRawConfig()).toHaveProperty('features', { manuscriptDescriptions: true });
  });

  it('still writes the other whitelisted keys unchanged', async () => {
    const config = getDefaultConfig();
    config.sections.lightbox = false;
    config.searchCategories.images.enabled = false;

    const persisted = await writeSiteFeatures(config);
    expect(persisted.sections.lightbox).toBe(false);
    expect(persisted.searchCategories.images.enabled).toBe(false);
    expect(Object.keys(await readRawConfig()).sort()).toEqual([
      'features',
      'searchCategories',
      'sectionOrder',
      'sections',
    ]);
  });
});
