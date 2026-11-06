import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DEFAULT_MODEL_LABELS, getDefaultModelLabelsConfig } from './model-labels';
import { jsonResponse } from '@/test/responses';

const { apiFetch } = vi.hoisted(() => ({ apiFetch: vi.fn() }));

vi.mock('./api-fetch', () => ({ apiFetch }));

const { readModelLabels } = await import('./model-labels-server');

beforeEach(() => {
  apiFetch.mockReset();
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('readModelLabels', () => {
  it('returns the backend labels merged over defaults, read fresh', async () => {
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
    expect(apiFetch).toHaveBeenCalledWith('/api/v1/site-labels/', { cache: 'no-store' });
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
  ])('falls back to the defaults on %s', async (_case, arrange) => {
    arrange();

    const config = await readModelLabels();

    expect(config).toEqual(getDefaultModelLabelsConfig());
  });
});
