import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getDefaultConfig, type SiteFeaturesConfig } from '@/lib/site-features';
import { readSiteFeatures, writeSiteFeatures } from '@/lib/site-features-server';

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

vi.mock('@/lib/api-fetch', () => ({
  authFetch: vi.fn(
    async () =>
      new Response(JSON.stringify({ is_staff: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
  ),
}));

import type { NextRequest } from 'next/server';
import { PUT } from './route';

let workDir: string;

// The route persists through lib/json-config-file, which resolves
// `config/site-features.json` under process.cwd() — point it at a scratch dir
// so the repo's runtime config file is never touched.
beforeEach(async () => {
  workDir = await mkdtemp(join(tmpdir(), 'site-features-route-'));
  vi.spyOn(process, 'cwd').mockReturnValue(workDir);
});

afterEach(async () => {
  vi.restoreAllMocks();
  await rm(workDir, { recursive: true, force: true });
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
    await writeSiteFeatures(disabled);

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
    await writeSiteFeatures(disabled);

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
    const { authFetch } = await import('@/lib/api-fetch');
    vi.mocked(authFetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ is_staff: false }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    );
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
