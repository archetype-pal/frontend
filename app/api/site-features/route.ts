import { NextRequest, NextResponse } from 'next/server';
import { readSiteFeatures, writeSiteFeatures } from '@/lib/site-features-server';
import type { SiteFeaturesConfig } from '@/lib/site-features';
import { env } from '@/lib/env';

async function verifyStaff(token: string): Promise<boolean> {
  try {
    const res = await fetch(`${env.apiUrl}/api/v1/auth/profile`, {
      headers: { Authorization: `Token ${token}` },
    });
    if (!res.ok) return false;
    const user = await res.json();
    return user.is_staff === true;
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

  const isStaff = await verifyStaff(token);
  if (!isStaff) {
    return NextResponse.json({ error: 'Staff access required' }, { status: 403 });
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
  await writeSiteFeatures(body as SiteFeaturesConfig);
  return NextResponse.json(body);
}
