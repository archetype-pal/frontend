import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getDefaultConfig } from './site-features';

const { apiFetch, authFetch } = vi.hoisted(() => ({
  apiFetch: vi.fn(),
  authFetch: vi.fn(),
}));

vi.mock('./api-fetch', () => ({ apiFetch, authFetch }));

// Imported after the mock so `readSiteFeatures`/`writeSiteFeatures` pick up
// the mocked `apiFetch`/`authFetch` rather than issuing real network calls.
const { readSiteFeatures, writeSiteFeatures } = await import('./site-features-server');

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

beforeEach(() => {
  apiFetch.mockReset();
  authFetch.mockReset();
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
    expect(apiFetch).toHaveBeenCalledWith('/api/v1/site-features/');
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

  it('falls back to defaults when the response is not ok', async () => {
    apiFetch.mockResolvedValueOnce(jsonResponse({ error: 'nope' }, 500));
    const config = await readSiteFeatures();
    expect(config).toEqual(getDefaultConfig());
  });

  it('falls back to defaults when the fetch throws (network error)', async () => {
    apiFetch.mockRejectedValueOnce(new Error('network down'));
    const config = await readSiteFeatures();
    expect(config).toEqual(getDefaultConfig());
  });

  it('falls back to defaults when the response body is not a plain object', async () => {
    for (const junk of [null, [], 'oops', 7]) {
      apiFetch.mockResolvedValueOnce(jsonResponse(junk));
      const config = await readSiteFeatures();
      expect(config).toEqual(getDefaultConfig());
    }
  });

  it('falls back to defaults when response.json() throws (malformed JSON)', async () => {
    apiFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.reject(new Error('bad json')),
    } as unknown as Response);
    const config = await readSiteFeatures();
    expect(config).toEqual(getDefaultConfig());
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
    expect(path).toBe('/api/v1/site-features/');
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
