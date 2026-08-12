import { revalidatePath } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';
import { authFetch } from '@/lib/api-fetch';
import { readSiteFeatures, writeSiteFeatures } from '@/lib/site-features-server';
import { mergeFeatureFlags, type SiteFeaturesConfig } from '@/lib/site-features';

async function verifySuperuser(token: string): Promise<boolean> {
  try {
    const res = await authFetch('/api/v1/auth/profile', token);
    if (!res.ok) return false;
    const user = await res.json();
    return user.is_superuser === true;
  } catch {
    return false;
  }
}

export async function GET() {
  const config = await readSiteFeatures();
  return NextResponse.json(config);
}

export async function PUT(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  const token = authHeader?.replace(/^Token\s+/i, '');
  if (!token) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const isSuperuser = await verifySuperuser(token);
  if (!isSuperuser) {
    return NextResponse.json({ error: 'Superuser access required' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  if (!body || typeof body !== 'object' || !('sections' in body) || !('searchCategories' in body)) {
    return NextResponse.json({ error: 'Invalid config shape' }, { status: 400 });
  }
  // `features` is deliberately NOT required by the shape guard, and is merged
  // over what's already on disk rather than replacing it. A payload from a
  // client that predates a flag (a stale tab, a cached bundle, a scripted PUT)
  // simply omits the key — requiring it would 400 those clients, and replacing
  // with it would silently re-enable a feature an admin had turned off. Merging
  // means an omitted key keeps the stored value while a newer client that sends
  // the full map still wins key-by-key.
  const payload = body as SiteFeaturesConfig;
  const current = await readSiteFeatures();
  let normalized: SiteFeaturesConfig;
  try {
    normalized = await writeSiteFeatures(
      {
        ...payload,
        features: mergeFeatureFlags(current.features, (payload as { features?: unknown }).features),
      },
      token
    );
  } catch {
    return NextResponse.json({ error: 'Failed to update site features' }, { status: 502 });
  }
  revalidatePath('/', 'layout');
  // Return the normalized config (with sectionOrder canonicalized) so the
  // client's cache reflects what's actually on disk.
  return NextResponse.json(normalized);
}
