import { revalidatePath } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';
import { authFetch } from '@/lib/api-fetch';
import { authorizeSuperuser, getServerAuthToken } from '@/lib/auth-token-server';
import { crossOriginRefusal, isSameOriginRequest } from '@/lib/same-origin';

const MANAGEMENT_HEADINGS_PATH = '/api/v1/management/menu-headings/';

export async function GET() {
  const { token, refusal } = await authorizeSuperuser(await getServerAuthToken());
  if (refusal) return refusal;

  const res = await authFetch(MANAGEMENT_HEADINGS_PATH, token);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return NextResponse.json(data, { status: res.status });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) return crossOriginRefusal();
  const { token, refusal } = await authorizeSuperuser(await getServerAuthToken());
  if (refusal) return refusal;

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
