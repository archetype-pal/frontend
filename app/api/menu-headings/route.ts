import { revalidatePath } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';
import { authFetch } from '@/lib/api-fetch';
import { getServerAuthToken } from '@/lib/auth-token-server';
import { crossOriginRefusal, isSameOriginRequest } from '@/lib/same-origin';

const MANAGEMENT_HEADINGS_PATH = '/api/v1/management/menu-headings/';

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
  const token = await getServerAuthToken();
  if (!token) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }
  if (!(await verifySuperuser(token))) {
    return NextResponse.json({ error: 'Superuser access required' }, { status: 403 });
  }

  const res = await authFetch(MANAGEMENT_HEADINGS_PATH, token);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return NextResponse.json(data, { status: res.status });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) return crossOriginRefusal();
  const token = await getServerAuthToken();
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

  const res = await authFetch(MANAGEMENT_HEADINGS_PATH, token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return NextResponse.json(data, { status: res.status });

  // Headings render in the header on every page of the site, so bust the
  // whole layout the same way page writes do.
  revalidatePath('/', 'layout');
  return NextResponse.json(data, { status: 201 });
}
