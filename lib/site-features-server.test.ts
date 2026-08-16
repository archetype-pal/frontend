import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getDefaultConfig } from './site-features';

const { apiFetch, authFetch } = vi.hoisted(() => ({
  apiFetch: vi.fn(),
  authFetch: vi.fn(),
}));

vi.mock('./api-fetch', () => ({ apiFetch, authFetch }));

// Re-imported per test (after the api-fetch mock, and after `vi.resetModules`)
// so the module-scope last-known-good starts empty each time.
let readSiteFeatures: typeof import('./site-features-server').readSiteFeatures;
let writeSiteFeatures: typeof import('./site-features-server').writeSiteFeatures;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

/** The backend response shape as it exists today: no `features` key at all. */
function legacyResponseBody() {
  const { sections, sectionOrder, searchCategories } = getDefaultConfig();
  return { sections, sectionOrder, searchCategories };
}

beforeEach(async () => {
  apiFetch.mockReset();
  authFetch.mockReset();
  vi.resetModules();
  ({ readSiteFeatures, writeSiteFeatures } = await import('./site-features-server'));
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
    expect(apiFetch).toHaveBeenCalledWith('/api/v1/app-settings/', {
      next: { revalidate: 60, tags: ['site-features'] },
    });
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

  it('flags the fallback as degraded rather than passing it off as a real config', async () => {
    const failures: unknown[] = [
      jsonResponse({ error: 'nope' }, 500),
      ...[null, [], 'oops', 7].map((junk) => jsonResponse(junk)),
      { ok: true, json: () => Promise.reject(new Error('bad json')) },
    ];
    for (const failure of failures) {
      apiFetch.mockResolvedValueOnce(failure as Response);
      expect(await readSiteFeatures()).toEqual({ ...getDefaultConfig(), degraded: true });
    }
    apiFetch.mockRejectedValueOnce(new Error('network down'));
    expect(await readSiteFeatures()).toEqual({ ...getDefaultConfig(), degraded: true });
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
    expect(config.degraded).toBe(true);
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
});

describe('writeSiteFeatures', () => {
  it('PUTs the normalized config with the token and returns it on success', async () => {
    authFetch.mockResolvedValueOnce(jsonResponse({ ok: true }));
    const config = getDefaultConfig();
    config.features.manuscriptDescriptions = false;

    const normalized = await writeSiteFeatures(config, 'staff-token');

    expect(normalized.features.manuscriptDescriptions).toBe(false);
    expect(authFetch).toHaveBeenCalledTimes(1);
    const [path, token, init] = authFetch.mock.calls[0];
    expect(path).toBe('/api/v1/app-settings/');
    expect(token).toBe('staff-token');
    expect(init).toMatchObject({
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
    });
    expect(JSON.parse(init.body as string)).toEqual(normalized);
  });

  it('persists a complete boolean map even if the caller hands over a partial one', async () => {
    authFetch.mockResolvedValueOnce(jsonResponse({ ok: true }));
    const config = getDefaultConfig();
    // @ts-expect-error — a hand-rolled/older payload without the flag map
    delete config.features;

    const normalized = await writeSiteFeatures(config, 'staff-token');
    expect(normalized.features).toEqual({ manuscriptDescriptions: true });
  });

  it('throws when the backend responds with a non-ok status', async () => {
    authFetch.mockResolvedValueOnce(jsonResponse({ error: 'bad request' }, 400));
    await expect(writeSiteFeatures(getDefaultConfig(), 'staff-token')).rejects.toThrow();
  });

  it('propagates a network error', async () => {
    authFetch.mockRejectedValueOnce(new Error('network down'));
    await expect(writeSiteFeatures(getDefaultConfig(), 'staff-token')).rejects.toThrow(
      'network down'
    );
  });
});
