import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DEFAULT_MODEL_LABELS, getDefaultModelLabelsConfig } from './model-labels';

const { apiFetch, authFetch } = vi.hoisted(() => ({
  apiFetch: vi.fn(),
  authFetch: vi.fn(),
}));

vi.mock('./api-fetch', () => ({ apiFetch, authFetch }));

const { readModelLabels, writeModelLabels, SITE_LABELS_TAG } =
  await import('./model-labels-server');

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

beforeEach(() => {
  apiFetch.mockReset();
  authFetch.mockReset();
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('readModelLabels', () => {
  it('returns the backend labels merged over defaults, from a tagged fetch', async () => {
    apiFetch.mockResolvedValueOnce(
      jsonResponse({
        labels: { siteTitle: { en: 'Archetype EN', fr: 'Archetype FR', de: 'Archetype DE' } },
      })
    );

    const config = await readModelLabels();

    expect(config.labels.siteTitle).toEqual({
      en: 'Archetype EN',
      fr: 'Archetype FR',
      de: 'Archetype DE',
    });
    expect(config.labels.appManuscripts).toEqual(DEFAULT_MODEL_LABELS.appManuscripts);
    expect(config.degraded).toBeUndefined();
    expect(apiFetch).toHaveBeenCalledWith('/api/v1/site-labels/', {
      next: { revalidate: 60, tags: [SITE_LABELS_TAG] },
    });
  });

  it.each([
    ['a non-2xx response', () => apiFetch.mockResolvedValueOnce(jsonResponse({}, 503))],
    ['a 200 with a malformed body', () => apiFetch.mockResolvedValueOnce(jsonResponse([]))],
    ['a thrown fetch', () => apiFetch.mockRejectedValueOnce(new Error('network down'))],
    // What an un-migrated / empty `SiteLabel` table answers with.
    [
      'a 200 with an empty labels map',
      () => apiFetch.mockResolvedValueOnce(jsonResponse({ labels: {} })),
    ],
  ])('flags the defaults as degraded on %s', async (_case, arrange) => {
    arrange();

    const config = await readModelLabels();

    expect(config.labels).toEqual(getDefaultModelLabelsConfig().labels);
    expect(config.degraded).toBe(true);
  });
});

describe('writeModelLabels', () => {
  it('sends only the given keys and returns the backend re-read', async () => {
    authFetch.mockResolvedValueOnce(
      jsonResponse({ labels: { siteTitle: { en: 'Stored', fr: 'Stocké', de: 'Gespeichert' } } })
    );

    const config = await writeModelLabels(
      { siteTitle: { en: 'Archetype EN', fr: 'Archetype FR', de: 'Archetype DE' } },
      'tok'
    );

    const body = JSON.parse(authFetch.mock.calls[0][2].body);
    expect(Object.keys(body.labels)).toEqual(['siteTitle']);
    expect(config?.labels.siteTitle).toEqual({
      en: 'Stored',
      fr: 'Stocké',
      de: 'Gespeichert',
    });
  });

  it('returns null rather than defaults when the write lands but returns no labels', async () => {
    authFetch.mockResolvedValueOnce(jsonResponse({ labels: {} }));

    await expect(
      writeModelLabels(
        { siteTitle: { en: 'Archetype EN', fr: 'Archetype FR', de: 'Archetype DE' } },
        'tok'
      )
    ).resolves.toBeNull();
  });
});
