import { NextRequest, NextResponse } from 'next/server';
import { authFetch } from '@/lib/api-fetch';
import { clearAuthCookies, getServerAuthToken } from '@/lib/auth-token-server';
import { crossOriginRefusal, isSameOriginRequest } from '@/lib/same-origin';

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) return crossOriginRefusal();

  const token = await getServerAuthToken();
  if (token) {
    // Revoke it so a captured copy dies with the session. A failure must not
    // keep the visitor signed in, so the cookies go either way.
    await authFetch('/api/v1/auth/token/logout', token, { method: 'POST' }).catch(() => {});
  }
  const response = new NextResponse(null, { status: 204 });
  clearAuthCookies(response, request);
  return response;
}
