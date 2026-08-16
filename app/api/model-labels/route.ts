import { revalidatePath, revalidateTag } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';
import { authFetch } from '@/lib/api-fetch';
import { readModelLabels, writeModelLabels, SITE_LABELS_TAG } from '@/lib/model-labels-server';
import {
  DEFAULT_MODEL_LABELS,
  normalizeLocalizedValue,
  type ModelLabelKey,
  type ModelLabelsConfig,
} from '@/lib/model-labels';

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
  const config = await readModelLabels();
  if (config.degraded) {
    return NextResponse.json({ error: 'Labels backend unavailable' }, { status: 503 });
  }
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

  if (!body || typeof body !== 'object' || !('labels' in body)) {
    return NextResponse.json({ error: 'Invalid config shape' }, { status: 400 });
  }

  // Forward only the keys the client sent: the backend upserts per key, so an
  // absent key keeps its stored value instead of being reset to a default.
  const incoming = (body as { labels?: Record<string, unknown> }).labels ?? {};
  const labels = Object.fromEntries(
    (Object.keys(incoming) as ModelLabelKey[])
      .filter((key) => key in DEFAULT_MODEL_LABELS)
      .map((key) => [key, normalizeLocalizedValue(incoming[key], DEFAULT_MODEL_LABELS[key])])
  );

  let config: ModelLabelsConfig | null;
  try {
    config = await writeModelLabels(labels, token);
  } catch (err) {
    console.error('[model-labels] write failed', err);
    const status =
      err &&
      typeof err === 'object' &&
      'status' in err &&
      typeof (err as { status: unknown }).status === 'number'
        ? (err as { status: number }).status
        : 502;
    return NextResponse.json(
      {
        error: 'Failed to update site labels',
        // A 5xx body is a DRF HTML error page; it must not reach a toast.
        detail: status < 500 ? (err as Error).message : undefined,
      },
      { status }
    );
  }
  // `{ expire: 0 }` hard-expires the tag; a named cacheLife profile only marks it stale.
  revalidateTag(SITE_LABELS_TAG, { expire: 0 });
  revalidatePath('/', 'layout');
  // The upsert landed; 204 says so without inventing a config the client would cache.
  return config ? NextResponse.json(config) : new NextResponse(null, { status: 204 });
}
