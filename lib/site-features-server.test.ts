import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getDefaultConfig, getDefaultThemeColors } from './site-features';
import { jsonResponse } from '@/test/responses';

const { apiFetch } = vi.hoisted(() => ({ apiFetch: vi.fn() }));

vi.mock('./api-fetch', () => ({ apiFetch }));

// Re-imported per test (after the api-fetch mock, and after `vi.resetModules`)
// so the module-scope last-known-good starts empty each time.
let readSiteFeatures: typeof import('./site-features-server').readSiteFeatures;

/** The backend response shape as it exists today: no `features` key at all. */
function legacyResponseBody() {
  const { sections, sectionOrder, searchCategories } = getDefaultConfig();
  return { sections, sectionOrder, searchCategories };
}

beforeEach(async () => {
  apiFetch.mockReset();
  vi.resetModules();
  ({ readSiteFeatures } = await import('./site-features-server'));
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('readSiteFeatures', () => {
  it('returns the backend config merged over defaults on a successful GET', async () => {
    apiFetch.mockResolvedValueOnce(
      jsonResponse({ ...legacyResponseBody(), features: { manuscriptDescriptions: false } })
    );
    const config = await readSiteFeatures();
    expect(config.features.manuscriptDescriptions).toBe(false);
    expect(apiFetch).toHaveBeenCalledWith('/api/v1/app-settings/', { cache: 'no-store' });
  });

  it('defaults every flag to enabled when the backend response has no `features` key', async () => {
    apiFetch.mockResolvedValueOnce(jsonResponse(legacyResponseBody()));
    const config = await readSiteFeatures();
    expect(config.features.manuscriptDescriptions).toBe(true);
  });

  it('merges a partial searchCategories override over the defaults', async () => {
    apiFetch.mockResolvedValueOnce(
      jsonResponse({
        ...legacyResponseBody(),
        searchCategories: { images: { enabled: false } },
      })
    );
    const config = await readSiteFeatures();
    expect(config.searchCategories.images.enabled).toBe(false);
    // Untouched keys of the same category, and other categories, keep defaults.
    const defaults = getDefaultConfig();
    expect(config.searchCategories.images.visibleColumns).toEqual(
      defaults.searchCategories.images.visibleColumns
    );
    expect(config.searchCategories).not.toBe(defaults.searchCategories);
  });

  it('falls back to the defaults when it has never read a config', async () => {
    const failures: unknown[] = [
      jsonResponse({ error: 'nope' }, 500),
      ...[null, [], 'oops', 7].map((junk) => jsonResponse(junk)),
      { ok: true, json: () => Promise.reject(new Error('bad json')) },
    ];
    for (const failure of failures) {
      apiFetch.mockResolvedValueOnce(failure as Response);
      expect(await readSiteFeatures()).toEqual(getDefaultConfig());
    }
    apiFetch.mockRejectedValueOnce(new Error('network down'));
    expect(await readSiteFeatures()).toEqual(getDefaultConfig());
  });

  it('serves the last successful config when a later read fails', async () => {
    const stored = getDefaultConfig();
    stored.sections.lightbox = false;
    stored.features.manuscriptDescriptions = false;
    apiFetch.mockResolvedValueOnce(jsonResponse(stored));
    await readSiteFeatures();

    apiFetch.mockResolvedValueOnce(jsonResponse({ error: 'nope' }, 500));
    const config = await readSiteFeatures();
    expect(config.sections.lightbox).toBe(false);
    expect(config.features.manuscriptDescriptions).toBe(false);
  });

  it('hands out copies, so a consumer mutation cannot corrupt the remembered config', async () => {
    const stored = getDefaultConfig();
    stored.sections.lightbox = false;
    apiFetch.mockResolvedValueOnce(jsonResponse(stored));
    (await readSiteFeatures()).sections.lightbox = true;

    apiFetch.mockRejectedValueOnce(new Error('network down'));
    expect((await readSiteFeatures()).sections.lightbox).toBe(false);
  });

  it('ignores unknown flag keys and non-boolean values from the backend', async () => {
    apiFetch.mockResolvedValueOnce(
      jsonResponse({
        ...legacyResponseBody(),
        features: { manuscriptDescriptions: 'false', bogusFlag: true },
      })
    );
    const config = await readSiteFeatures();
    expect(config.features).toEqual({ manuscriptDescriptions: true });
  });

  it('defaults every colour when the backend response has no `theme` key', async () => {
    apiFetch.mockResolvedValueOnce(jsonResponse(legacyResponseBody()));
    const config = await readSiteFeatures();
    expect(config.theme).toEqual(getDefaultThemeColors());
  });

  it('merges a partial theme override over the defaults', async () => {
    apiFetch.mockResolvedValueOnce(
      jsonResponse({ ...legacyResponseBody(), theme: { accentColor: '#abcdef' } })
    );
    const config = await readSiteFeatures();
    expect(config.theme).toEqual({ ...getDefaultThemeColors(), accentColor: '#abcdef' });
  });

  it('ignores malformed theme values from the backend', async () => {
    apiFetch.mockResolvedValueOnce(
      jsonResponse({ ...legacyResponseBody(), theme: { primaryColor: 'not-a-colour' } })
    );
    const config = await readSiteFeatures();
    expect(config.theme).toEqual(getDefaultThemeColors());
  });
});
