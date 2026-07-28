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

type RouteParams = { params: Promise<{ slug: string }> };

export async function GET(request: NextRequest, { params }: RouteParams) {
  const token = getToken(request);
  if (!token) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }
  if (!(await verifySuperuser(token))) {
    return NextResponse.json({ error: 'Superuser access required' }, { status: 403 });
  }

  const { slug } = await params;
  const res = await authFetch(`${MANAGEMENT_PAGES_PATH}${encodeURIComponent(slug)}/`, token);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return NextResponse.json(data, { status: res.status });
  return NextResponse.json(data);
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
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

  const { slug } = await params;
  const res = await authFetch(`${MANAGEMENT_PAGES_PATH}${encodeURIComponent(slug)}/`, token, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return NextResponse.json(data, { status: res.status });

  revalidatePath('/', 'layout');
  revalidatePath(`/about/${slug}`);
  // The slug itself may have just changed — revalidate the new one too.
  if (typeof data?.slug === 'string' && data.slug !== slug) {
    revalidatePath(`/about/${data.slug}`);
  }
  return NextResponse.json(data);
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const token = getToken(request);
  if (!token) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }
  if (!(await verifySuperuser(token))) {
    return NextResponse.json({ error: 'Superuser access required' }, { status: 403 });
  }

  const { slug } = await params;
  const res = await authFetch(`${MANAGEMENT_PAGES_PATH}${encodeURIComponent(slug)}/`, token, {
    method: 'DELETE',
  });

  if (!res.ok && res.status !== 204) {
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  }

  revalidatePath('/', 'layout');
  revalidatePath(`/about/${slug}`);
  return new NextResponse(null, { status: 204 });
}
