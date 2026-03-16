import { NextRequest, NextResponse } from 'next/server';
import { env } from '@/lib/env';
import { readModelLabels, writeModelLabels } from '@/lib/model-labels-server';
import { normalizeModelLabels, type ModelLabelsConfig } from '@/lib/model-labels';

async function verifySuperuser(token: string): Promise<boolean> {
  try {
    const res = await fetch(`${env.apiUrl}/api/v1/auth/profile`, {
      headers: { Authorization: `Token ${token}` },
    });
    if (!res.ok) return false;
    const user = await res.json();
    return user.is_superuser === true;
  } catch {
    return false;
  }
}

export async function GET() {
  const config = await readModelLabels();
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

  const config: ModelLabelsConfig = {
    labels: normalizeModelLabels((body as { labels?: unknown }).labels as Record<string, unknown>),
  };
  await writeModelLabels(config);
  return NextResponse.json(config);
}
