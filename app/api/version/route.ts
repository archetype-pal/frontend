import { NextResponse } from 'next/server';
import { apiFetch } from '@/lib/api-fetch';

// CD stamps the build in the runner stage, after `next build`, so this must
// read the env at request time.
export const dynamic = 'force-dynamic';

/** Both halves of a deploy, since the frontend and the API ship separately.
 *  `api` is null when the backend cannot be reached. */
export async function GET() {
  const frontend = {
    version: process.env.APP_VERSION || 'dev',
    commit: process.env.APP_COMMIT || 'unknown',
  };
  let api = null;
  try {
    const res = await apiFetch('/api/v1/version/', { cache: 'no-store' });
    if (res.ok) api = await res.json();
  } catch {
    // Still report the frontend build.
  }
  return NextResponse.json({ frontend, api });
}
