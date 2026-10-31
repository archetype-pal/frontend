import { revalidatePath } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';
import { authFetch } from '@/lib/api-fetch';
import { authorizeSuperuser, getServerAuthToken } from '@/lib/auth-token-server';
import { crossOriginRefusal, isSameOriginRequest } from '@/lib/same-origin';
import { MANAGEMENT_HEADINGS_PATH } from '@/lib/backoffice/management-paths';

type RouteParams = { params: Promise<{ slug: string }> };

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { token, refusal } = await authorizeSuperuser(await getServerAuthToken());
  if (refusal) return refusal;

  const { slug } = await params;
  const res = await authFetch(`${MANAGEMENT_HEADINGS_PATH}${encodeURIComponent(slug)}/`, token);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return NextResponse.json(data, { status: res.status });
  return NextResponse.json(data);
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  if (!isSameOriginRequest(request)) return crossOriginRefusal();
  const { token, refusal } = await authorizeSuperuser(await getServerAuthToken());
  if (refusal) return refusal;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { slug } = await params;
  const res = await authFetch(`${MANAGEMENT_HEADINGS_PATH}${encodeURIComponent(slug)}/`, token, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return NextResponse.json(data, { status: res.status });

  // The layout covers the header and, through it, every page's sidebar.
  revalidatePath('/', 'layout');
  return NextResponse.json(data);
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  if (!isSameOriginRequest(request)) return crossOriginRefusal();
  const { token, refusal } = await authorizeSuperuser(await getServerAuthToken());
  if (refusal) return refusal;

  const { slug } = await params;
  const res = await authFetch(`${MANAGEMENT_HEADINGS_PATH}${encodeURIComponent(slug)}/`, token, {
    method: 'DELETE',
  });

  if (!res.ok && res.status !== 204) {
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  }

  // The heading's pages fall back under About.
  revalidatePath('/', 'layout');
  return new NextResponse(null, { status: 204 });
}
