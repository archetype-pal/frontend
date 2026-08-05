import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getDefaultConfig, type SiteFeaturesConfig } from '@/lib/site-features';
import { readSiteFeatures } from '@/lib/site-features-server';

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

const { apiFetch, authFetch } = vi.hoisted(() => ({
  apiFetch: vi.fn(),
  authFetch: vi.fn(),
}));

vi.mock('@/lib/api-fetch', () => ({ apiFetch, authFetch }));

import type { NextRequest } from 'next/server';
import { PUT } from './route';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

/**
 * A tiny in-memory stand-in for the backend's `AppSettings` row: `apiFetch`
 * (the GET used by `readSiteFeatures`) reads it, `authFetch`'s PUT branch
 * (the write used by `writeSiteFeatures`) replaces it. `isStaff` gates the
 * PUT handler's own profile check the same way the real backend would.
 */
let stored: SiteFeaturesConfig;
let isStaff: boolean;

beforeEach(() => {
  stored = getDefaultConfig();
  isStaff = true;

  apiFetch.mockReset();
  authFetch.mockReset();

  apiFetch.mockImplementation(async () => jsonResponse(stored));
  authFetch.mockImplementation(async (path: string, _token: string, init?: RequestInit) => {
    if (path === '/api/v1/auth/profile') {
      return jsonResponse({ is_staff: isStaff });
    }
    // The site-features PUT: persist the body into the fake store.
    stored = JSON.parse((init?.body as string) ?? '{}') as SiteFeaturesConfig;
    return jsonResponse(stored);
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

/** Minimal duck-typed request: the handler only reads the header and the body. */
function putRequest(body: unknown): NextRequest {
  return {
    headers: new Headers({ Authorization: 'Token staff-token' }),
    json: async () => body,
  } as unknown as NextRequest;
}

/** A payload from a client that predates feature flags: no `features` key. */
function payloadWithoutFeatures(): Omit<SiteFeaturesConfig, 'features'> {
  const { sections, sectionOrder, searchCategories } = getDefaultConfig();
  return { sections, sectionOrder, searchCategories };
}

describe('PUT /api/site-features — feature flags', () => {
  it('accepts a payload with no `features` key (the flag map is optional)', async () => {
    const response = await PUT(putRequest(payloadWithoutFeatures()));
    expect(response.status).toBe(200);
    expect(await response.json()).toHaveProperty('features', { manuscriptDescriptions: true });
  });

  it('does NOT wipe a disabled flag when the payload omits `features`', async () => {
    // An older client (stale tab, cached bundle, scripted PUT) saving section
    // toggles must not silently switch a feature the admin turned off back on.
    const disabled = getDefaultConfig();
    disabled.features.manuscriptDescriptions = false;
    stored = disabled;

    const response = await PUT(putRequest(payloadWithoutFeatures()));
    expect(response.status).toBe(200);
    expect((await readSiteFeatures()).features.manuscriptDescriptions).toBe(false);
  });

  it('applies the flags a current client does send', async () => {
    const config = getDefaultConfig();
    config.features.manuscriptDescriptions = false;

    const response = await PUT(putRequest(config));
    expect((await response.json()).features).toEqual({ manuscriptDescriptions: false });
    expect((await readSiteFeatures()).features.manuscriptDescriptions).toBe(false);
  });

  it('lets a current client re-enable a flag (merge is key-by-key, not one-way)', async () => {
    const disabled = getDefaultConfig();
    disabled.features.manuscriptDescriptions = false;
    stored = disabled;

    await PUT(putRequest(getDefaultConfig()));
    expect((await readSiteFeatures()).features.manuscriptDescriptions).toBe(true);
  });

  it('ignores unknown flag keys in the payload', async () => {
    const response = await PUT(
      putRequest({ ...payloadWithoutFeatures(), features: { bogusFlag: false } })
    );
    expect((await response.json()).features).toEqual({ manuscriptDescriptions: true });
  });

  it('still rejects a payload missing the required keys', async () => {
    const response = await PUT(putRequest({ features: { manuscriptDescriptions: false } }));
    expect(response.status).toBe(400);
  });
});

describe('PUT /api/site-features — the staff gate protecting the flags', () => {
  /** Same duck-typed request, but with caller-controlled auth headers. */
  function requestWithAuth(body: unknown, authorization?: string): NextRequest {
    return {
      headers: new Headers(authorization ? { Authorization: authorization } : {}),
      json: async () => body,
    } as unknown as NextRequest;
  }

  it('rejects an unauthenticated caller before touching the config', async () => {
    const before = await readSiteFeatures();
    const res = await PUT(
      requestWithAuth({ ...getDefaultConfig(), features: { manuscriptDescriptions: false } })
    );
    expect(res.status).toBe(401);
    expect((await readSiteFeatures()).features).toEqual(before.features);
  });

  it('rejects a non-staff caller before touching the config', async () => {
    isStaff = false;
    const before = await readSiteFeatures();
    const res = await PUT(
      requestWithAuth(
        { ...getDefaultConfig(), features: { manuscriptDescriptions: false } },
        'Token not-staff'
      )
    );
    expect(res.status).toBe(403);
    expect((await readSiteFeatures()).features).toEqual(before.features);
  });
});

describe('PUT /api/site-features — backend write failure', () => {
  it('returns 502 when the backend PUT fails, without crashing the route', async () => {
    authFetch.mockImplementation(async (path: string) => {
      if (path === '/api/v1/auth/profile') return jsonResponse({ is_staff: true });
      return jsonResponse({ error: 'backend unavailable' }, 500);
    });

    const response = await PUT(putRequest(getDefaultConfig()));
    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: 'Failed to update site features' });
  });
});
