/**
 * Centralized API fetch wrapper with optional performance logging.
 *
 * In development, logs method, path, status and duration for each request.
 */

import { env } from '@/lib/env';

/**
 * Public backend origin — safe to embed in the browser (download hrefs, URLs
 * built for client-side fetches). Always the public `NEXT_PUBLIC_API_URL`.
 */
export const API_BASE_URL = env.apiUrl;

/**
 * Origin `apiFetch` itself requests against. On the server (RSC render,
 * `generateMetadata`, route handlers, `sitemap.ts`) reach the backend via the
 * container-internal host (`INTERNAL_API_URL`, e.g. host.docker.internal); in
 * the browser use the public origin. On the host and in production both resolve
 * to the same value. Evaluated once per runtime — the server and client bundles
 * are separate module instances, so `typeof window` is stable here.
 */
const REQUEST_BASE_URL = typeof window === 'undefined' ? env.internalApiUrl : env.apiUrl;

/** Threshold in ms – requests slower than this are flagged when logging. */
const SLOW_THRESHOLD = 500;

const isDev = process.env.NODE_ENV === 'development';

export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const url = `${REQUEST_BASE_URL}${path}`;
  const method = init?.method ?? 'GET';
  const start = performance.now();

  try {
    const res = await fetch(url, init);
    if (isDev) {
      const duration = performance.now() - start;
      const tag = duration > SLOW_THRESHOLD ? 'SLOW' : 'OK';
      console.log(`[API] ${tag} ${method} ${path} → ${res.status} (${duration.toFixed(1)}ms)`);
    }
    return res;
  } catch (err) {
    if (isDev) {
      const duration = performance.now() - start;
      console.error(`[API] ERR  ${method} ${path} FAILED (${duration.toFixed(1)}ms)`, err);
    }
    throw err;
  }
}

/**
 * apiFetch with the `Authorization: Token …` header pre-set.
 *
 * Accepts a nullable token so optional-auth services (read endpoints that
 * upgrade their response when authenticated) can call this unconditionally
 * instead of branching at every call site. When token is null/undefined or
 * empty, no Authorization header is set.
 */
export async function authFetch(
  path: string,
  token: string | null | undefined,
  init?: RequestInit
): Promise<Response> {
  const headers = new Headers(init?.headers);
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Token ${token}`);
  }
  return apiFetch(path, { ...init, headers });
}
