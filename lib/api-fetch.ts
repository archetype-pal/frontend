/**
 * Centralized API fetch wrapper with performance + failure logging.
 *
 * In development, logs method, path, status and duration for every request.
 * In all environments, a non-2xx response or a thrown error is logged:
 * callers like `readModelLabels()`/`readSiteFeatures()`/`getPublishedPages()`
 * swallow those into a default value, so nothing else would ever surface them.
 * Successful responses stay dev-only to avoid flooding production logs.
 */

import { env } from '@/lib/env';

// SSR and route handlers fetch via the server-side base (which may differ in
// the containerized dev mode); the browser always uses the public URL.
export const API_BASE_URL = typeof window === 'undefined' ? env.serverApiUrl : env.apiUrl;

/** Threshold in ms – requests slower than this are flagged when logging. */
const SLOW_THRESHOLD = 500;

const isDev = process.env.NODE_ENV === 'development';

export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const url = `${API_BASE_URL}${path}`;
  const method = init?.method ?? 'GET';
  const start = performance.now();

  try {
    const res = await fetch(url, init);
    const duration = performance.now() - start;
    if (!res.ok) {
      console.error(
        `[API] ${method} ${path} → ${res.status} ${res.statusText} (${duration.toFixed(1)}ms)`
      );
    } else if (isDev) {
      const tag = duration > SLOW_THRESHOLD ? 'SLOW' : 'OK';
      console.log(`[API] ${tag} ${method} ${path} → ${res.status} (${duration.toFixed(1)}ms)`);
    }
    return res;
  } catch (err) {
    // TanStack Query aborts the in-flight request on every key change, i.e. on
    // every keystroke in the tei-ref picker. Not a failure worth logging.
    if ((err as Error)?.name !== 'AbortError') {
      const duration = performance.now() - start;
      console.error(`[API] ${method} ${path} FAILED (${duration.toFixed(1)}ms)`, err);
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
