import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getDefaultModelLabelsConfig, type ModelLabelsConfig } from '@/lib/model-labels';

const { revalidateTag } = vi.hoisted(() => ({ revalidateTag: vi.fn() }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn(), revalidateTag }));

const { apiFetch, authFetch } = vi.hoisted(() => ({
  apiFetch: vi.fn(),
  authFetch: vi.fn(),
}));

vi.mock('@/lib/api-fetch', () => ({ apiFetch, authFetch }));

import type { NextRequest } from 'next/server';
import { GET, PUT } from './route';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

let stored: ModelLabelsConfig;

beforeEach(() => {
  stored = getDefaultModelLabelsConfig();

  apiFetch.mockReset();
  authFetch.mockReset();
  revalidateTag.mockReset();
  vi.spyOn(console, 'error').mockImplementation(() => {});

  apiFetch.mockImplementation(async () => jsonResponse(stored));
  authFetch.mockImplementation(async (path: string, _token: string, init?: RequestInit) => {
    if (path === '/api/v1/auth/profile') return jsonResponse({ is_superuser: true });
    const { labels } = JSON.parse((init?.body as string) ?? '{}');
    stored = { labels: { ...stored.labels, ...labels } };
    return jsonResponse(stored);
  });
});

function putRequest(body: unknown): NextRequest {
  return {
    headers: new Headers({ Authorization: 'Token su-token' }),
    json: async () => body,
  } as unknown as NextRequest;
}

describe('GET /api/model-labels', () => {
  it('serves the stored labels when the backend is healthy', async () => {
    stored.labels.siteTitle = {
      en: 'Archetype EN',
      fr: 'Archetype FR',
      de: 'Archetype DE',
    };

    const response = await GET();

    expect(response.status).toBe(200);
    expect((await response.json()).labels.siteTitle).toEqual(stored.labels.siteTitle);
  });

  it('answers 503 rather than serving the defaults as stored labels', async () => {
    apiFetch.mockResolvedValueOnce(jsonResponse({}, 500));
    const response = await GET();
    expect(response.status).toBe(503);
  });
});

describe('PUT /api/model-labels', () => {
  it('forwards only the keys it was given and leaves the rest stored', async () => {
    stored.labels.appManuscripts = { en: 'Corpus', fr: 'Corpus', de: 'Corpus' };

    const response = await PUT(
      putRequest({
        labels: { siteTitle: { en: 'Archetype EN', fr: 'Archetype FR', de: 'Archetype DE' } },
      })
    );

    const body = JSON.parse(authFetch.mock.calls[1][2].body);
    expect(Object.keys(body.labels)).toEqual(['siteTitle']);
    // A concurrent rename must survive an unrelated save.
    expect(stored.labels.appManuscripts).toEqual({ en: 'Corpus', fr: 'Corpus', de: 'Corpus' });
    expect((await response.json()).labels.appManuscripts).toEqual({
      en: 'Corpus',
      fr: 'Corpus',
      de: 'Corpus',
    });
  });

  it('drops unknown keys instead of letting the backend reject the payload', async () => {
    await PUT(putRequest({ labels: { bogusKey: { en: 'x', fr: 'x' } } }));
    expect(JSON.parse(authFetch.mock.calls[1][2].body).labels).toEqual({});
  });

  it('hard-expires the cache tag on success', async () => {
    await PUT(
      putRequest({
        labels: { siteTitle: { en: 'Archetype EN', fr: 'Archetype FR', de: 'Archetype DE' } },
      })
    );
    expect(revalidateTag).toHaveBeenCalledWith('site-labels', { expire: 0 });
  });

  it('acknowledges a write whose response carries no labels, and still purges the tag', async () => {
    authFetch.mockImplementation(async (path: string) =>
      path === '/api/v1/auth/profile'
        ? jsonResponse({ is_superuser: true })
        : jsonResponse({ labels: {} })
    );

    const response = await PUT(
      putRequest({
        labels: { siteTitle: { en: 'Archetype EN', fr: 'Archetype FR', de: 'Archetype DE' } },
      })
    );

    expect(response.status).toBe(204);
    expect(revalidateTag).toHaveBeenCalledWith('site-labels', { expire: 0 });
  });

  it('propagates an upstream 4xx with its reason', async () => {
    authFetch.mockImplementation(async (path: string) =>
      path === '/api/v1/auth/profile'
        ? jsonResponse({ is_superuser: true })
        : new Response('unknown key', { status: 403 })
    );

    const response = await PUT(
      putRequest({
        labels: { siteTitle: { en: 'Archetype EN', fr: 'Archetype FR', de: 'Archetype DE' } },
      })
    );

    expect(response.status).toBe(403);
    expect((await response.json()).detail).toContain('unknown key');
  });

  it('passes an upstream 5xx through without leaking its body', async () => {
    authFetch.mockImplementation(async (path: string) =>
      path === '/api/v1/auth/profile'
        ? jsonResponse({ is_superuser: true })
        : new Response('<html>DRF error page</html>', { status: 500 })
    );

    const response = await PUT(
      putRequest({
        labels: { siteTitle: { en: 'Archetype EN', fr: 'Archetype FR', de: 'Archetype DE' } },
      })
    );

    expect(response.status).toBe(500);
    expect(JSON.stringify(await response.json())).not.toContain('DRF');
  });

  it('maps a thrown write to 502', async () => {
    authFetch.mockImplementation(async (path: string) => {
      if (path === '/api/v1/auth/profile') return jsonResponse({ is_superuser: true });
      throw new Error('socket hang up');
    });

    const response = await PUT(
      putRequest({
        labels: { siteTitle: { en: 'Archetype EN', fr: 'Archetype FR', de: 'Archetype DE' } },
      })
    );

    expect(response.status).toBe(502);
    expect(await response.json()).not.toHaveProperty('detail');
  });
});
