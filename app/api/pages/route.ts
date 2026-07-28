import { revalidatePath } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';
import { authFetch } from '@/lib/api-fetch';

const MANAGEMENT_PAGES_PATH = '/api/v1/management/pages/';

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

function getToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('Authorization');
  return authHeader?.replace(/^Token\s+/i, '') || null;
}

export async function GET(request: NextRequest) {
  const token = getToken(request);
  if (!token) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }
  if (!(await verifySuperuser(token))) {
    return NextResponse.json({ error: 'Superuser access required' }, { status: 403 });
  }

  const res = await authFetch(MANAGEMENT_PAGES_PATH, token);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return NextResponse.json(data, { status: res.status });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const token = getToken(request);
  if (!token) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }
  if (!(await verifySuperuser(token))) {
    return NextResponse.json({ error: 'Superuser access required' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const res = await authFetch(MANAGEMENT_PAGES_PATH, token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return NextResponse.json(data, { status: res.status });

  // A new Page can appear in the About menu/sidebar on every page of the
  // site, so bust the whole layout the same way model-labels writes do.
  revalidatePath('/', 'layout');
  return NextResponse.json(data, { status: 201 });
}
